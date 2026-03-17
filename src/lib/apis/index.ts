import { get } from 'svelte/store';
import { COMPATIBLE_SERVER_URL } from '$lib/stores';

const normalizeBaseUrl = (baseUrl: string) => baseUrl.trim().replace(/\/+$/, '');

type ProbeFailure = {
	url: string;
	status?: number;
	message: string;
};

const readErrorBody = async (response: Response) => {
	try {
		return await response.json();
	} catch {
		try {
			return await response.text();
		} catch {
			return null;
		}
	}
};

const compactText = (value: string, maxLength: number = 120) => {
	const normalized = value.replace(/\s+/g, ' ').trim();
	if (normalized.length <= maxLength) {
		return normalized;
	}

	return `${normalized.slice(0, maxLength - 1)}...`;
};

const describeProbeError = (error: unknown) => {
	if (typeof error === 'string') {
		return compactText(error);
	}

	if (error instanceof Error) {
		return compactText(error.message || 'Request failed.');
	}

	if (error && typeof error === 'object') {
		const detail =
			typeof (error as { detail?: unknown }).detail === 'string'
				? (error as { detail: string }).detail
				: typeof (error as { message?: unknown }).message === 'string'
					? (error as { message: string }).message
					: null;

		if (detail) {
			return compactText(detail);
		}

		try {
			return compactText(JSON.stringify(error));
		} catch {
			return 'Request failed.';
		}
	}

	return 'Request failed.';
};

const getJson = async (url: string, headers: Record<string, string>) => {
	const response = await fetch(url, {
		method: 'GET',
		headers
	});

	if (!response.ok) {
		throw await readErrorBody(response);
	}

	return response.json();
};

const getJsonForProbe = async (
	url: string,
	headers: Record<string, string>,
	failures: ProbeFailure[]
) => {
	try {
		const response = await fetch(url, {
			method: 'GET',
			headers
		});

		if (!response.ok) {
			const errorBody = await readErrorBody(response);
			failures.push({
				url,
				status: response.status,
				message: describeProbeError(errorBody)
			});
			console.error(errorBody);
			return null;
		}

		try {
			return await response.json();
		} catch (error) {
			console.error(error);
			failures.push({
				url,
				status: response.status,
				message: 'Response was not valid JSON.'
			});
			return null;
		}
	} catch (error) {
		console.error(error);
		failures.push({
			url,
			message: describeProbeError(error)
		});
		return null;
	}
};

const buildProbeFailureMessage = (baseUrl: string, failures: ProbeFailure[]) => {
	const endpoints = failures.map(({ url }) => {
		try {
			return new URL(url).pathname;
		} catch {
			return url.replace(baseUrl, '') || url;
		}
	});

	const formattedChecks = endpoints.join(', ');
	const firstFailure = failures[0];

	if (failures.some(({ status }) => status === 401 || status === 403)) {
		return `The server responded, but Dora was not allowed to read its config or models. Checked ${formattedChecks}. If this backend requires a token before exposing those endpoints, this URL alone is not enough.`;
	}

	if (failures.length > 0 && failures.every(({ status }) => status === 404)) {
		return `The server is reachable, but it does not expose Dora's expected endpoints at this base URL. Checked ${formattedChecks}. Use the server root URL, not a docs page or model-specific endpoint.`;
	}

	if (failures.every(({ status }) => status == null)) {
		const isTauriOrigin =
			typeof window !== 'undefined' &&
			(window.location.protocol === 'tauri:' || window.location.hostname === 'tauri.localhost');

		if (isTauriOrigin) {
			return `Dora could not reach ${baseUrl} from the desktop app. If this is an Open WebUI server and the URL is correct, the likely issue is CORS for the Tauri app origin. In Open WebUI, allow Dora's origin in CORS_ALLOW_ORIGIN and add tauri to CORS_ALLOW_CUSTOM_SCHEME.`;
		}

		return `Dora could not reach ${baseUrl}. Check the protocol, host, port, and whether the server is running.`;
	}

	return `Could not read backend configuration or models from that server URL. Checked ${formattedChecks}. First failure: ${firstFailure ? `${firstFailure.message}${firstFailure.status ? ` (HTTP ${firstFailure.status})` : ''}.` : 'request failed.'}`;
};

const deriveServerName = (baseUrl: string, explicitName?: string | null) => {
	if (explicitName?.trim()) {
		return explicitName.trim();
	}

	try {
		return new URL(baseUrl).hostname || baseUrl;
	} catch {
		return baseUrl || 'Compatible Server';
	}
};

const probeAuthEndpoint = async (url: string) => {
	try {
		const response = await fetch(url, {
			method: 'GET',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json'
			}
		});

		return response.ok || [400, 401, 403, 405, 422].includes(response.status);
	} catch (error) {
		console.error(error);
		return false;
	}
};

export const detectAuthBootstrapServer = async (baseUrl: string) => {
	const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
	if (!normalizedBaseUrl) {
		return false;
	}

	for (const endpoint of [
		`${normalizedBaseUrl}/api/auths/signup/enabled`,
		`${normalizedBaseUrl}/api/auths/signin`
	]) {
		if (await probeAuthEndpoint(endpoint)) {
			return true;
		}
	}

	return false;
};

const normalizeCompatibleModels = (payload: any, discoveredBaseUrl: string) => {
	const rawModels = Array.isArray(payload)
		? payload
		: Array.isArray(payload?.data)
			? payload.data
			: [];

	return rawModels
		.filter((model) => typeof model?.id === 'string' && model.id.trim() !== '')
		.map((model) => ({
			id: model.id,
			name: model.name ?? model.id,
			owned_by: 'openai' as const,
			external: true,
			source: 'compatible',
			info: {
				baseUrl: discoveredBaseUrl,
				meta: {
					profile_image_url: model?.info?.meta?.profile_image_url,
					description: model?.description ?? '',
					capabilities: {
						usage: true,
						vision: true,
						...(model?.info?.meta?.capabilities ?? {})
					}
				},
				...(model?.info ?? {})
			}
		}));
};

export const probeCompatibleServer = async (baseUrl: string, token: string = '') => {
	const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
	if (!normalizedBaseUrl) {
		throw new Error('Please enter a server URL.');
	}

	const headers = {
		Accept: 'application/json',
		'Content-Type': 'application/json',
		...(token && { authorization: `Bearer ${token}` })
	};
	const probeFailures: ProbeFailure[] = [];

	const config = await getJsonForProbe(
		`${normalizedBaseUrl}/api/config`,
		{
			'Content-Type': 'application/json'
		},
		probeFailures
	);

	let models = [];
	let discoveredOpenAIBaseUrl = `${normalizedBaseUrl}/v1`;

	const backendModels = await getJsonForProbe(`${normalizedBaseUrl}/api/models`, headers, probeFailures);
	models = backendModels?.data ?? [];

	if (!models.length) {
		const compatibilityEndpoints = [`${normalizedBaseUrl}/v1/models`, `${normalizedBaseUrl}/models`];

		for (const modelsUrl of compatibilityEndpoints) {
			const res = await getJsonForProbe(modelsUrl, headers, probeFailures);
			if (!res) {
				continue;
			}

			discoveredOpenAIBaseUrl = modelsUrl.replace(/\/models$/, '');
			models = normalizeCompatibleModels(res, discoveredOpenAIBaseUrl);

			if (models.length > 0) {
				break;
			}
		}
	}

	if (!config && models.length === 0) {
		const authRequired = await detectAuthBootstrapServer(normalizedBaseUrl);
		if (!authRequired) {
			throw new Error(buildProbeFailureMessage(normalizedBaseUrl, probeFailures));
		}

		return {
			baseUrl: normalizedBaseUrl,
			name: deriveServerName(normalizedBaseUrl),
			config,
			models,
			modelCount: 0,
			compatibilityMode: false,
			authRequired: true,
			openAIBaseUrl: discoveredOpenAIBaseUrl
		};
	}

	return {
		baseUrl: normalizedBaseUrl,
		name: deriveServerName(normalizedBaseUrl, config?.name),
		config,
		models,
		modelCount: models.length,
		compatibilityMode: !config,
		authRequired: false,
		openAIBaseUrl: discoveredOpenAIBaseUrl
	};
};

export const getModels = async (token: string = '', base: boolean = false) => {
	const baseUrl = get(COMPATIBLE_SERVER_URL);
	const headers = {
		Accept: 'application/json',
		'Content-Type': 'application/json',
		...(token && { authorization: `Bearer ${token}` })
	};

	try {
		const res = await getJson(`${baseUrl}/api/models${base ? '/base' : ''}`, headers);
		return res?.data ?? [];
	} catch (error) {
		console.error(error);
	}

	if (base) {
		return [];
	}

	const compatibilityEndpoints = [`${baseUrl}/v1/models`, `${baseUrl}/models`];

	for (const modelsUrl of compatibilityEndpoints) {
		try {
			const res = await getJson(modelsUrl, headers);
			const discoveredBaseUrl = modelsUrl.replace(/\/models$/, '');
			const models = normalizeCompatibleModels(res, discoveredBaseUrl);

			if (models.length > 0) {
				return models;
			}
		} catch (error) {
			console.error(error);
		}
	}

	return [];
};

type ChatCompletedForm = {
	model: string;
	messages: any[];
	chat_id: string;
	session_id: string;
	id?: string;
	[key: string]: any;
};

export const chatCompleted = async (token: string, body: ChatCompletedForm) => {
	let error = null;

	const res = await fetch(`${get(COMPATIBLE_SERVER_URL)}/api/chat/completed`, {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			...(token && { authorization: `Bearer ${token}` })
		},
		body: JSON.stringify(body)
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			if ('detail' in err) {
				error = err.detail;
			} else {
				error = err;
			}
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

type ChatActionForm = {
	model: string;
	messages: any[];
	chat_id: string;
	[key: string]: any;
};

export const chatAction = async (token: string, action_id: string, body: ChatActionForm) => {
	let error = null;

	const res = await fetch(`${get(COMPATIBLE_SERVER_URL)}/api/chat/actions/${action_id}`, {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			...(token && { authorization: `Bearer ${token}` })
		},
		body: JSON.stringify(body)
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			if ('detail' in err) {
				error = err.detail;
			} else {
				error = err;
			}
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

export const getTaskConfig = async (token: string = '') => {
	let error = null;

	const res = await fetch(`${get(COMPATIBLE_SERVER_URL)}/api/task/config`, {
		method: 'GET',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			...(token && { authorization: `Bearer ${token}` })
		}
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			error = err;
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

export const updateTaskConfig = async (token: string, config: object) => {
	let error = null;

	const res = await fetch(`${get(COMPATIBLE_SERVER_URL)}/api/task/config/update`, {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			...(token && { authorization: `Bearer ${token}` })
		},
		body: JSON.stringify(config)
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			if ('detail' in err) {
				error = err.detail;
			} else {
				error = err;
			}
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

export const generateTitle = async (
	token: string = '',
	model: string,
	messages: string[],
	chat_id?: string
) => {
	let error = null;

	const res = await fetch(`${get(COMPATIBLE_SERVER_URL)}/api/task/title/completions`, {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({
			model: model,
			messages: messages,
			...(chat_id && { chat_id: chat_id })
		})
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			if ('detail' in err) {
				error = err.detail;
			}
			return null;
		});

	if (error) {
		throw error;
	}

	return res?.choices[0]?.message?.content.replace(/["']/g, '') ?? 'New Chat';
};

export const generateTags = async (
	token: string = '',
	model: string,
	messages: string,
	chat_id?: string
) => {
	let error = null;

	const res = await fetch(`${get(COMPATIBLE_SERVER_URL)}/api/task/tags/completions`, {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({
			model: model,
			messages: messages,
			...(chat_id && { chat_id: chat_id })
		})
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			if ('detail' in err) {
				error = err.detail;
			}
			return null;
		});

	if (error) {
		throw error;
	}

	try {
		// Step 1: Safely extract the response string
		const response = res?.choices[0]?.message?.content ?? '';

		// Step 2: Attempt to fix common JSON format issues like single quotes
		const sanitizedResponse = response.replace(/['‘’`]/g, '"'); // Convert single quotes to double quotes for valid JSON

		// Step 3: Find the relevant JSON block within the response
		const jsonStartIndex = sanitizedResponse.indexOf('{');
		const jsonEndIndex = sanitizedResponse.lastIndexOf('}');

		// Step 4: Check if we found a valid JSON block (with both `{` and `}`)
		if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
			const jsonResponse = sanitizedResponse.substring(jsonStartIndex, jsonEndIndex + 1);

			// Step 5: Parse the JSON block
			const parsed = JSON.parse(jsonResponse);

			// Step 6: If there's a "tags" key, return the tags array; otherwise, return an empty array
			if (parsed && parsed.tags) {
				return Array.isArray(parsed.tags) ? parsed.tags : [];
			} else {
				return [];
			}
		}

		// If no valid JSON block found, return an empty array
		return [];
	} catch (e) {
		// Catch and safely return empty array on any parsing errors
		console.error('Failed to parse response: ', e);
		return [];
	}
};

export const generateEmoji = async (
	token: string = '',
	model: string,
	prompt: string,
	chat_id?: string
) => {
	let error = null;

	const res = await fetch(`${get(COMPATIBLE_SERVER_URL)}/api/task/emoji/completions`, {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({
			model: model,
			prompt: prompt,
			...(chat_id && { chat_id: chat_id })
		})
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			if ('detail' in err) {
				error = err.detail;
			}
			return null;
		});

	if (error) {
		throw error;
	}

	const response = res?.choices[0]?.message?.content.replace(/["']/g, '') ?? null;

	if (response) {
		if (/\p{Extended_Pictographic}/u.test(response)) {
			return response.match(/\p{Extended_Pictographic}/gu)[0];
		}
	}

	return null;
};

export const generateQueries = async (
	token: string = '',
	model: string,
	messages: object[],
	prompt: string,
	type: string = 'web_search'
) => {
	let error = null;

	const res = await fetch(`${get(COMPATIBLE_SERVER_URL)}/api/task/queries/completions`, {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({
			model: model,
			messages: messages,
			prompt: prompt,
			type: type
		})
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			if ('detail' in err) {
				error = err.detail;
			}
			return null;
		});

	if (error) {
		throw error;
	}

	// Step 1: Safely extract the response string
	const response = res?.choices[0]?.message?.content ?? '';

	try {
		const jsonStartIndex = response.indexOf('{');
		const jsonEndIndex = response.lastIndexOf('}');

		if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
			const jsonResponse = response.substring(jsonStartIndex, jsonEndIndex + 1);

			// Step 5: Parse the JSON block
			const parsed = JSON.parse(jsonResponse);

			// Step 6: If there's a "queries" key, return the queries array; otherwise, return an empty array
			if (parsed && parsed.queries) {
				return Array.isArray(parsed.queries) ? parsed.queries : [];
			} else {
				return [];
			}
		}

		// If no valid JSON block found, return response as is
		return [response];
	} catch (e) {
		// Catch and safely return empty array on any parsing errors
		console.error('Failed to parse response: ', e);
		return [response];
	}
};

export const generateAutoCompletion = async (
	token: string = '',
	model: string,
	prompt: string,
	messages?: object[],
	type: string = 'search query'
) => {
	const controller = new AbortController();
	let error = null;

	const res = await fetch(`${get(COMPATIBLE_SERVER_URL)}/api/task/auto/completions`, {
		signal: controller.signal,
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({
			model: model,
			prompt: prompt,
			...(messages && { messages: messages }),
			type: type,
			stream: false
		})
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			if ('detail' in err) {
				error = err.detail;
			}
			return null;
		});

	if (error) {
		throw error;
	}

	const response = res?.choices[0]?.message?.content ?? '';

	try {
		const jsonStartIndex = response.indexOf('{');
		const jsonEndIndex = response.lastIndexOf('}');

		if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
			const jsonResponse = response.substring(jsonStartIndex, jsonEndIndex + 1);

			// Step 5: Parse the JSON block
			const parsed = JSON.parse(jsonResponse);

			// Step 6: If there's a "queries" key, return the queries array; otherwise, return an empty array
			if (parsed && parsed.text) {
				return parsed.text;
			} else {
				return '';
			}
		}

		// If no valid JSON block found, return response as is
		return response;
	} catch (e) {
		// Catch and safely return empty array on any parsing errors
		console.error('Failed to parse response: ', e);
		return response;
	}
};

export const generateMoACompletion = async (
	token: string = '',
	model: string,
	prompt: string,
	responses: string[]
) => {
	const controller = new AbortController();
	let error = null;

	const res = await fetch(`${get(COMPATIBLE_SERVER_URL)}/api/task/moa/completions`, {
		signal: controller.signal,
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({
			model: model,
			prompt: prompt,
			responses: responses,
			stream: true
		})
	}).catch((err) => {
		console.log(err);
		error = err;
		return null;
	});

	if (error) {
		throw error;
	}

	return [res, controller];
};

export const getPipelinesList = async (token: string = '') => {
	let error = null;

	const res = await fetch(`${get(COMPATIBLE_SERVER_URL)}/api/pipelines/list`, {
		method: 'GET',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			...(token && { authorization: `Bearer ${token}` })
		}
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			error = err;
			return null;
		});

	if (error) {
		throw error;
	}

	const pipelines = res?.data ?? [];
	return pipelines;
};

export const uploadPipeline = async (token: string, file: File, urlIdx: string) => {
	let error = null;

	// Create a new FormData object to handle the file upload
	const formData = new FormData();
	formData.append('file', file);
	formData.append('urlIdx', urlIdx);

	const res = await fetch(`${get(COMPATIBLE_SERVER_URL)}/api/pipelines/upload`, {
		method: 'POST',
		headers: {
			...(token && { authorization: `Bearer ${token}` })
			// 'Content-Type': 'multipart/form-data' is not needed as Fetch API will set it automatically
		},
		body: formData
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			if ('detail' in err) {
				error = err.detail;
			} else {
				error = err;
			}
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

export const downloadPipeline = async (token: string, url: string, urlIdx: string) => {
	let error = null;

	const res = await fetch(`${get(COMPATIBLE_SERVER_URL)}/api/pipelines/add`, {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			...(token && { authorization: `Bearer ${token}` })
		},
		body: JSON.stringify({
			url: url,
			urlIdx: urlIdx
		})
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			if ('detail' in err) {
				error = err.detail;
			} else {
				error = err;
			}
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

export const deletePipeline = async (token: string, id: string, urlIdx: string) => {
	let error = null;

	const res = await fetch(`${get(COMPATIBLE_SERVER_URL)}/api/pipelines/delete`, {
		method: 'DELETE',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			...(token && { authorization: `Bearer ${token}` })
		},
		body: JSON.stringify({
			id: id,
			urlIdx: urlIdx
		})
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			if ('detail' in err) {
				error = err.detail;
			} else {
				error = err;
			}
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

export const getPipelines = async (token: string, urlIdx?: string) => {
	let error = null;

	const searchParams = new URLSearchParams();
	if (urlIdx !== undefined) {
		searchParams.append('urlIdx', urlIdx);
	}

	const res = await fetch(`${get(COMPATIBLE_SERVER_URL)}/api/pipelines?${searchParams.toString()}`, {
		method: 'GET',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			...(token && { authorization: `Bearer ${token}` })
		}
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			error = err;
			return null;
		});

	if (error) {
		throw error;
	}

	const pipelines = res?.data ?? [];
	return pipelines;
};

export const getPipelineValves = async (token: string, pipeline_id: string, urlIdx: string) => {
	let error = null;

	const searchParams = new URLSearchParams();
	if (urlIdx !== undefined) {
		searchParams.append('urlIdx', urlIdx);
	}

	const res = await fetch(
		`${get(COMPATIBLE_SERVER_URL)}/api/pipelines/${pipeline_id}/valves?${searchParams.toString()}`,
		{
			method: 'GET',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
				...(token && { authorization: `Bearer ${token}` })
			}
		}
	)
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			error = err;
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

export const getPipelineValvesSpec = async (token: string, pipeline_id: string, urlIdx: string) => {
	let error = null;

	const searchParams = new URLSearchParams();
	if (urlIdx !== undefined) {
		searchParams.append('urlIdx', urlIdx);
	}

	const res = await fetch(
		`${get(COMPATIBLE_SERVER_URL)}/api/pipelines/${pipeline_id}/valves/spec?${searchParams.toString()}`,
		{
			method: 'GET',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
				...(token && { authorization: `Bearer ${token}` })
			}
		}
	)
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			error = err;
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

export const updatePipelineValves = async (
	token: string = '',
	pipeline_id: string,
	valves: object,
	urlIdx: string
) => {
	let error = null;

	const searchParams = new URLSearchParams();
	if (urlIdx !== undefined) {
		searchParams.append('urlIdx', urlIdx);
	}

	const res = await fetch(
		`${get(COMPATIBLE_SERVER_URL)}/api/pipelines/${pipeline_id}/valves/update?${searchParams.toString()}`,
		{
			method: 'POST',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
				...(token && { authorization: `Bearer ${token}` })
			},
			body: JSON.stringify(valves)
		}
	)
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);

			if ('detail' in err) {
				error = err.detail;
			} else {
				error = err;
			}
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

export const getBackendConfig = async () => {
	let error = null;

	const res = await fetch(`${get(COMPATIBLE_SERVER_URL)}/api/config`, {
		method: 'GET',
		// credentials: 'include',
		headers: {
			'Content-Type': 'application/json'
		}
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			error = err;
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

export const getChangelog = async () => {
	let error = null;

	const res = await fetch(`${get(COMPATIBLE_SERVER_URL)}/api/changelog`, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json'
		}
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			error = err;
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

export const getVersionUpdates = async () => {
	let error = null;

	const res = await fetch(`${get(COMPATIBLE_SERVER_URL)}/api/version/updates`, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json'
		}
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			error = err;
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

export const getModelFilterConfig = async (token: string) => {
	let error = null;

	const res = await fetch(`${get(COMPATIBLE_SERVER_URL)}/api/config/model/filter`, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		}
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			error = err;
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

export const updateModelFilterConfig = async (
	token: string,
	enabled: boolean,
	models: string[]
) => {
	let error = null;

	const res = await fetch(`${get(COMPATIBLE_SERVER_URL)}/api/config/model/filter`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({
			enabled: enabled,
			models: models
		})
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			error = err;
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

export const getWebhookUrl = async (token: string) => {
	let error = null;

	const res = await fetch(`${get(COMPATIBLE_SERVER_URL)}/api/webhook`, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		}
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			error = err;
			return null;
		});

	if (error) {
		throw error;
	}

	return res.url;
};

export const updateWebhookUrl = async (token: string, url: string) => {
	let error = null;

	const res = await fetch(`${get(COMPATIBLE_SERVER_URL)}/api/webhook`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({
			url: url
		})
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			error = err;
			return null;
		});

	if (error) {
		throw error;
	}

	return res.url;
};

export const getCommunitySharingEnabledStatus = async (token: string) => {
	let error = null;

	const res = await fetch(`${get(COMPATIBLE_SERVER_URL)}/api/community_sharing`, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		}
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			error = err;
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

export const toggleCommunitySharingEnabledStatus = async (token: string) => {
	let error = null;

	const res = await fetch(`${get(COMPATIBLE_SERVER_URL)}/api/community_sharing/toggle`, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		}
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			error = err.detail;
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

export const getModelConfig = async (token: string): Promise<GlobalModelConfig> => {
	let error = null;

	const res = await fetch(`${get(COMPATIBLE_SERVER_URL)}/api/config/models`, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		}
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			error = err;
			return null;
		});

	if (error) {
		throw error;
	}

	return res.models;
};

export interface ModelConfig {
	id: string;
	name: string;
	meta: ModelMeta;
	base_model_id?: string;
	params: ModelParams;
}

export interface ModelMeta {
	description?: string;
	capabilities?: Record<string, any>;
	profile_image_url?: string;
	suggestion_prompts?: any;
	tags?: any[];
	knowledge?: any[];
	toolIds?: string[];
	filterIds?: string[];
	actionIds?: string[];
	hidden?: boolean;
	[key: string]: any;
}

export interface ModelParams {
	[key: string]: any;
}

export type GlobalModelConfig = ModelConfig[];

export const updateModelConfig = async (token: string, config: GlobalModelConfig) => {
	let error = null;

	const res = await fetch(`${get(COMPATIBLE_SERVER_URL)}/api/config/models`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({
			models: config
		})
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			error = err;
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};
