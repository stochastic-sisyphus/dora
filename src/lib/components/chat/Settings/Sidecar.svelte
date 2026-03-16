<script lang="ts">
	import { sidecarConfig } from '$lib/sidecar/config';
	import type { SidecarConfig } from '$lib/sidecar/types';
	import { createEventDispatcher, onMount } from 'svelte';

	const dispatch = createEventDispatcher();

	let searchUrl = '';
	let searchMethod: 'GET' | 'POST' = 'GET';
	let searchResponsePath = '';

	let llmUrl = '';
	let llmApiKey = '';
	let llmModel = '';
	let llmProvider: 'openai' | 'anthropic' | 'custom' = 'custom';

	let coreUrl = '';
	let coreApiKey = '';

	let webhookUrl = '';

	onMount(() => {
		const config = $sidecarConfig;
		if (config?.searchEndpoint) {
			searchUrl = config.searchEndpoint.url;
			searchMethod = config.searchEndpoint.method || 'GET';
			searchResponsePath = config.searchEndpoint.responsePath || '';
		}
		if (config?.llmEndpoint) {
			llmUrl = config.llmEndpoint.url;
			llmApiKey = config.llmEndpoint.apiKey || '';
			llmModel = config.llmEndpoint.model || '';
			llmProvider = config.llmEndpoint.provider || 'custom';
		}
		if (config?.core) {
			coreUrl = config.core.url;
			coreApiKey = config.core.apiKey || '';
		}
		if (config?.webhook) {
			webhookUrl = config.webhook.url;
		}
	});

	const saveConfig = async () => {
		const config: SidecarConfig = {};

		if (searchUrl) {
			config.searchEndpoint = {
				url: searchUrl,
				method: searchMethod,
				responsePath: searchResponsePath || undefined
			};
		}

		if (llmUrl) {
			config.llmEndpoint = {
				url: llmUrl,
				apiKey: llmApiKey || undefined,
				model: llmModel || undefined,
				provider: llmProvider
			};
		}

		if (coreUrl) {
			config.core = {
				url: coreUrl,
				apiKey: coreApiKey || undefined
			};
		}

		if (webhookUrl) {
			config.webhook = {
				url: webhookUrl
			};
		}

		$sidecarConfig = config;
		dispatch('save');
	};

	const clearConfig = () => {
		searchUrl = '';
		searchMethod = 'GET';
		searchResponsePath = '';
		llmUrl = '';
		llmApiKey = '';
		llmModel = '';
		llmProvider = 'custom';
		coreUrl = '';
		coreApiKey = '';
		webhookUrl = '';
		$sidecarConfig = {};
		dispatch('clear');
	};
</script>

<div class="flex flex-col space-y-6">
	<div>
		<div class="text-sm font-medium mb-1">Sidecar Configuration</div>
		<div class="text-xs text-gray-500">
			The bundled sidecar works without configuration. Add endpoints here only when you want it to route through your own infrastructure.
		</div>
	</div>

	<div class="space-y-3">
		<div class="text-sm font-medium">Search Endpoint</div>
		<div>
			<label class="block text-xs text-gray-500 mb-1" for="sidecar-search-url">URL</label>
			<input
				id="sidecar-search-url"
				type="url"
				bind:value={searchUrl}
				placeholder="https://your-search-api.example/search"
				class="w-full rounded-lg py-2 px-4 text-sm bg-gray-50 dark:text-gray-300 dark:bg-gray-850 outline-none"
			/>
			<p class="text-xs text-gray-500 mt-1">Leave blank to use the sidecar's built-in public fallback.</p>
		</div>
		<div class="grid grid-cols-2 gap-4">
			<div>
				<label class="block text-xs text-gray-500 mb-1" for="sidecar-search-method">Method</label>
				<select
					id="sidecar-search-method"
					bind:value={searchMethod}
					class="w-full rounded-lg py-2 px-4 text-sm bg-gray-50 dark:text-gray-300 dark:bg-gray-850 outline-none"
				>
					<option value="GET">GET</option>
					<option value="POST">POST</option>
				</select>
			</div>

			<div>
				<label class="block text-xs text-gray-500 mb-1" for="sidecar-search-path">Response Path</label>
				<input
					id="sidecar-search-path"
					type="text"
					bind:value={searchResponsePath}
					placeholder="data.results"
					class="w-full rounded-lg py-2 px-4 text-sm bg-gray-50 dark:text-gray-300 dark:bg-gray-850 outline-none"
				/>
			</div>
		</div>
	</div>

	<hr class="dark:border-gray-850 my-3" />

	<div class="space-y-3">
		<div class="text-sm font-medium">LLM Endpoint</div>
		<div>
			<label class="block text-xs text-gray-500 mb-1" for="sidecar-llm-url">URL</label>
			<input
				id="sidecar-llm-url"
				type="url"
				bind:value={llmUrl}
				placeholder="https://api.openai.com/v1/chat/completions"
				class="w-full rounded-lg py-2 px-4 text-sm bg-gray-50 dark:text-gray-300 dark:bg-gray-850 outline-none"
			/>
			<p class="text-xs text-gray-500 mt-1">Optional. Without this, extraction falls back to lightweight local heuristics.</p>
		</div>
		<div class="grid grid-cols-2 gap-4">
			<div>
				<label class="block text-xs text-gray-500 mb-1" for="sidecar-llm-provider">Provider</label>
				<select
					id="sidecar-llm-provider"
					bind:value={llmProvider}
					class="w-full rounded-lg py-2 px-4 text-sm bg-gray-50 dark:text-gray-300 dark:bg-gray-850 outline-none"
				>
					<option value="openai">OpenAI-compatible</option>
					<option value="anthropic">Anthropic</option>
					<option value="custom">Custom</option>
				</select>
			</div>

			<div>
				<label class="block text-xs text-gray-500 mb-1" for="sidecar-llm-model">Model</label>
				<input
					id="sidecar-llm-model"
					type="text"
					bind:value={llmModel}
					placeholder="gpt-4o-mini"
					class="w-full rounded-lg py-2 px-4 text-sm bg-gray-50 dark:text-gray-300 dark:bg-gray-850 outline-none"
				/>
			</div>
		</div>

		<div>
			<label class="block text-xs text-gray-500 mb-1" for="sidecar-llm-api-key">API Key</label>
			<input
				id="sidecar-llm-api-key"
				type="password"
				bind:value={llmApiKey}
				placeholder="sk-..."
				class="w-full rounded-lg py-2 px-4 text-sm bg-gray-50 dark:text-gray-300 dark:bg-gray-850 outline-none"
			/>
		</div>
	</div>

	<hr class="dark:border-gray-850 my-3" />

	<div class="space-y-3">
		<div class="text-sm font-medium">Core Endpoint</div>
		<p class="text-xs text-gray-500">
			Optional validation or persistence backend. The sidecar remains useful without it.
		</p>
		<div class="grid grid-cols-2 gap-4">
			<div>
				<label class="block text-xs text-gray-500 mb-1" for="sidecar-core-url">URL</label>
				<input
					id="sidecar-core-url"
					type="url"
					bind:value={coreUrl}
					placeholder="https://core.your-domain.com"
					class="w-full rounded-lg py-2 px-4 text-sm bg-gray-50 dark:text-gray-300 dark:bg-gray-850 outline-none"
				/>
			</div>

			<div>
				<label class="block text-xs text-gray-500 mb-1" for="sidecar-core-api-key">API Key</label>
				<input
					id="sidecar-core-api-key"
					type="password"
					bind:value={coreApiKey}
					placeholder="optional"
					class="w-full rounded-lg py-2 px-4 text-sm bg-gray-50 dark:text-gray-300 dark:bg-gray-850 outline-none"
				/>
			</div>
		</div>
	</div>

	<hr class="dark:border-gray-850 my-3" />

	<div class="space-y-3">
		<div class="text-sm font-medium">Webhook</div>
		<div>
			<label class="block text-xs text-gray-500 mb-1" for="sidecar-webhook-url">URL</label>
			<input
				id="sidecar-webhook-url"
				type="url"
				bind:value={webhookUrl}
				placeholder="https://hooks.example.com/dora"
				class="w-full rounded-lg py-2 px-4 text-sm bg-gray-50 dark:text-gray-300 dark:bg-gray-850 outline-none"
			/>
		</div>
	</div>

	<div class="flex gap-2 pt-2">
		<button
			type="button"
			class="rounded-lg px-4 py-2 text-sm bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
			on:click={saveConfig}
		>
			Save
		</button>
		<button
			type="button"
			class="rounded-lg px-4 py-2 text-sm bg-gray-100 text-gray-800 dark:bg-gray-850 dark:text-gray-200"
			on:click={clearConfig}
		>
			Clear
		</button>
	</div>
</div>
