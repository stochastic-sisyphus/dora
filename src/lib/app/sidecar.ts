import { get } from 'svelte/store';
import { sidecarConfig } from '$lib/sidecar/config';
import type {
	BrowseResult,
	Finding,
	RenderedContent,
	SearchResults,
	SidecarConfig,
	SidecarRequest,
	SidecarResponse
} from '$lib/sidecar/types';

const SIDECAR_PROGRAM = 'binaries/dora-sidecar';
const REQUEST_TIMEOUT_MS = 30000;

type ChildHandle = {
	write(data: string): Promise<void>;
	kill(): Promise<void>;
};

let sidecarChildPromise: Promise<ChildHandle> | null = null;
let stdoutBuffer = '';
let requestCounter = 0;

const pendingRequests = new Map<
	string,
	{
		resolve: (value: unknown) => void;
		reject: (reason?: unknown) => void;
		timeoutId: ReturnType<typeof setTimeout>;
	}
>();

async function loadShellCommand() {
	const shell = await import('@tauri-apps/plugin-shell');
	return shell.Command;
}

async function ensureSidecar(): Promise<ChildHandle> {
	if (sidecarChildPromise) {
		return sidecarChildPromise;
	}

	sidecarChildPromise = (async () => {
		const Command = await loadShellCommand();
		const command = Command.sidecar(SIDECAR_PROGRAM);

		command.stdout.on('data', (chunk) => {
			handleStdoutChunk(chunk);
		});

		command.stderr.on('data', (chunk) => {
			const message = String(chunk).trim();
			if (message) {
				console.error(`[sidecar] ${message}`);
			}
		});

		command.on('close', (payload) => {
			const error = new Error(
				`Sidecar exited${payload.code !== null ? ` with code ${payload.code}` : ''}.`
			);
			rejectAllPending(error);
			sidecarChildPromise = null;
		});

		command.on('error', (error) => {
			const failure = new Error(`Failed to spawn sidecar: ${error}`);
			rejectAllPending(failure);
			sidecarChildPromise = null;
		});

		return command.spawn();
	})();

	try {
		return await sidecarChildPromise;
	} catch (error) {
		sidecarChildPromise = null;
		throw error;
	}
}

function handleStdoutChunk(chunk: string | Uint8Array): void {
	stdoutBuffer += typeof chunk === 'string' ? chunk : new TextDecoder().decode(chunk);

	while (true) {
		const newlineIndex = stdoutBuffer.indexOf('\n');
		if (newlineIndex === -1) {
			break;
		}

		const line = stdoutBuffer.slice(0, newlineIndex).trim();
		stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1);

		if (!line) {
			continue;
		}

		let response: SidecarResponse;
		try {
			response = JSON.parse(line) as SidecarResponse;
		} catch (error) {
			console.error('Failed to parse sidecar response:', line, error);
			continue;
		}

		if (!response.id) {
			continue;
		}

		const pending = pendingRequests.get(response.id);
		if (!pending) {
			continue;
		}

		clearTimeout(pending.timeoutId);
		pendingRequests.delete(response.id);

		if (response.type === 'error') {
			pending.reject(new Error(response.error || 'Unknown sidecar error'));
		} else {
			pending.resolve(response.data);
		}
	}
}

function rejectAllPending(error: Error): void {
	for (const [requestId, pending] of pendingRequests.entries()) {
		clearTimeout(pending.timeoutId);
		pending.reject(error);
		pendingRequests.delete(requestId);
	}
}

function nextRequestId(): string {
	requestCounter += 1;
	return `sidecar-${Date.now()}-${requestCounter}`;
}

function getActiveConfig(overrides?: SidecarConfig): SidecarConfig {
	const config = ((get(sidecarConfig) ?? {}) as SidecarConfig);
	if (!overrides) {
		return config;
	}

	return {
		...config,
		...overrides,
		searchEndpoint: overrides.searchEndpoint ?? config.searchEndpoint,
		llmEndpoint: overrides.llmEndpoint ?? config.llmEndpoint,
		core: overrides.core ?? config.core,
		webhook: overrides.webhook ?? config.webhook
	};
}

async function requestSidecar<T>(
	type: SidecarRequest['type'],
	payload: SidecarRequest['payload'],
	config?: SidecarConfig
): Promise<T> {
	const child = await ensureSidecar();
	const requestId = nextRequestId();
	const message: SidecarRequest = {
		id: requestId,
		type,
		payload,
		config: getActiveConfig(config)
	};

	const promise = new Promise<T>((resolve, reject) => {
		const timeoutId = setTimeout(() => {
			pendingRequests.delete(requestId);
			reject(new Error(`Sidecar request timed out: ${type}`));
		}, REQUEST_TIMEOUT_MS);

		pendingRequests.set(requestId, {
			resolve: resolve as (value: unknown) => void,
			reject,
			timeoutId
		});
	});

	await child.write(`${JSON.stringify(message)}\n`);
	return promise;
}

export async function searchSidecar(
	query: string,
	config?: SidecarConfig
): Promise<SearchResults> {
	return requestSidecar<SearchResults>('search', { query }, config);
}

export async function browseSidecar(
	url: string,
	config?: SidecarConfig
): Promise<BrowseResult> {
	return requestSidecar<BrowseResult>('browse', { url }, config);
}

export async function extractSidecar(
	content: string,
	config?: SidecarConfig
): Promise<Finding> {
	return requestSidecar<Finding>('extract', { content }, config);
}

export async function renderSidecar(
	content: string,
	renderType: string = 'note',
	config?: SidecarConfig
): Promise<RenderedContent> {
	return requestSidecar<RenderedContent>('render', { content, renderType }, config);
}

export async function stopSidecar(): Promise<void> {
	if (!sidecarChildPromise) {
		return;
	}

	const child = await sidecarChildPromise;
	await child.kill();
	sidecarChildPromise = null;
	stdoutBuffer = '';
}
