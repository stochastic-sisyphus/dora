<script lang="ts">
    import { sidecarConfig } from '$lib/sidecar/config';
    import type { SidecarConfig, SearchEndpoint, LLMEndpoint, LedgerConfig } from '$lib/sidecar/types';
    import { createEventDispatcher, onMount } from 'svelte';

    const dispatch = createEventDispatcher();

    // Local state for form fields
    let searchUrl = '';
    let searchMethod: 'GET' | 'POST' = 'GET';
    let searchResponsePath = 'results';
    
    let llmUrl = '';
    let llmApiKey = '';
    let llmModel = '';
    let llmProvider: 'openai' | 'anthropic' | 'custom' = 'custom';
    
    let ledgerType: 'temporal' | 'postgres' | 'sqlite' | 'custom' = 'custom';
    let ledgerConnection = '';
    
    let webhookUrl = '';

    // Load existing config on mount
    onMount(() => {
        const config = $sidecarConfig;
        if (config?.searchEndpoint) {
            searchUrl = config.searchEndpoint.url;
            searchMethod = config.searchEndpoint.method || 'GET';
            searchResponsePath = config.searchEndpoint.responsePath || 'results';
        }
        if (config?.llmEndpoint) {
            llmUrl = config.llmEndpoint.url;
            llmApiKey = config.llmEndpoint.apiKey || '';
            llmModel = config.llmEndpoint.model || '';
            llmProvider = config.llmEndpoint.provider || 'custom';
        }
        if (config?.ledger) {
            ledgerType = config.ledger.type;
            ledgerConnection = config.ledger.connection;
        }
        if (config?.webhook) {
            webhookUrl = config.webhook.url;
        }
    });

    // Save configuration
    const saveConfig = async () => {
        const config: SidecarConfig = {};
        
        // Save search endpoint if URL provided
        if (searchUrl) {
            config.searchEndpoint = {
                url: searchUrl,
                method: searchMethod,
                responsePath: searchResponsePath
            };
        }
        
        // Save LLM endpoint if URL provided
        if (llmUrl) {
            config.llmEndpoint = {
                url: llmUrl,
                apiKey: llmApiKey || undefined,
                model: llmModel || undefined,
                provider: llmProvider
            };
        }
        
        // Save ledger if connection provided
        if (ledgerConnection) {
            config.ledger = {
                type: ledgerType,
                connection: ledgerConnection
            };
        }
        
        // Save webhook if URL provided
        if (webhookUrl) {
            config.webhook = {
                url: webhookUrl
            };
        }
        
        $sidecarConfig = config;
        dispatch('save');
    };

    // Clear configuration
    const clearConfig = () => {
        searchUrl = '';
        llmUrl = '';
        ledgerConnection = '';
        webhookUrl = '';
        $sidecarConfig = {};
        dispatch('clear');
    };
</script>

<div class="flex flex-col space-y-6">
    <!-- Header -->
    <div>
        <div class="text-sm font-medium mb-1">Sidecar Configuration</div>
        <div class="text-xs text-gray-500">
            Configure the sidecar for universal search, extraction, and ledger logging.
            All fields are optional - sidecar works without configuration.
        </div>
    </div>

    <!-- Search Endpoint -->
    <div class="space-y-3">
        <div class="text-sm font-medium">Search Endpoint</div>
        
        <div>
            <label class="block text-xs text-gray-500 mb-1">URL</label>
            <input
                type="url"
                bind:value={searchUrl}
                placeholder="https://searx.be"
                class="w-full rounded-lg py-2 px-4 text-sm bg-gray-50 dark:text-gray-300 dark:bg-gray-850 outline-none"
            />
            <p class="text-xs text-gray-500 mt-1">Any search API endpoint. Defaults to public SearXNG if unconfigured.</p>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
            <div>
                <label class="block text-xs text-gray-500 mb-1">Method</label>
                <select
                    bind:value={searchMethod}
                    class="w-full rounded-lg py-2 px-4 text-sm bg-gray-50 dark:text-gray-300 dark:bg-gray-850 outline-none"
                >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                </select>
            </div>
            
            <div>
                <label class="block text-xs text-gray-500 mb-1">Response Path</label>
                <input
                    type="text"
                    bind:value={searchResponsePath}
                    placeholder="results"
                    class="w-full rounded-lg py-2 px-4 text-sm bg-gray-50 dark:text-gray-300 dark:bg-gray-850 outline-none"
                />
            </div>
        </div>
    </div>

    <hr class="dark:border-gray-850 my-3" />

    <!-- LLM Endpoint -->
    <div class="space-y-3">
        <div class="text-sm font-medium">LLM Endpoint</div>
        
        <div>
            <label class="block text-xs text-gray-500 mb-1">URL</label>
            <input
                type="url"
                bind:value={llmUrl}
                placeholder="https://api.openai.com/v1/chat/completions"
                class="w-full rounded-lg py-2 px-4 text-sm bg-gray-50 dark:text-gray-300 dark:bg-gray-850 outline-none"
            />
            <p class="text-xs text-gray-500 mt-1">Any OpenAI or Anthropic-compatible API.</p>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
            <div>
                <label class="block text-xs text-gray-500 mb-1">Provider</label>
                <select
                    bind:value={llmProvider}
                    class="w-full rounded-lg py-2 px-4 text-sm bg-gray-50 dark:text-gray-300 dark:bg-gray-850 outline-none"
                >
                    <option value="openai">OpenAI-compatible</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="custom">Custom</option>
                </select>
            </div>
            
            <div>
                <label class="block text-xs text-gray-500 mb-1">Model</label>
                <input
                    type="text"
                    bind:value={llmModel}
                    placeholder="gpt-3.5-turbo"
                    class="w-full rounded-lg py-2 px-4 text-sm bg-gray-50 dark:text-gray-300 dark:bg-gray-850 outline-none"
                />
            </div>
        </div>
        
        <div>
            <label class="block text-xs text-gray-500 mb-1">API Key (optional)</label>
            <input
                type="password"
                bind:value={llmApiKey}
                placeholder="sk-..."
                class="w-full rounded-lg py-2 px-4 text-sm bg-gray-50 dark:text-gray-300 dark:bg-gray-850 outline-none"
            />
        </div>
    </div>

    <hr class="dark:border-gray-850 my-3" />

    <!-- Ledger Connection -->
    <div class="space-y-3">
        <div class="text-sm font-medium">Ledger Connection (optional)</div>
        
        <div class="grid grid-cols-2 gap-4">
            <div>
                <label class="block text-xs text-gray-500 mb-1">Type</label>
                <select
                    bind:value={ledgerType}
                    class="w-full rounded-lg py-2 px-4 text-sm bg-gray-50 dark:text-gray-300 dark:bg-gray-850 outline-none"
                >
                    <option value="temporal">Temporal</option>
                    <option value="postgres">PostgreSQL</option>
                    <option value="sqlite">SQLite</option>
                    <option value="custom">Custom</option>
                </select>
            </div>
            
            <div>
                <label class="block text-xs text-gray-500 mb-1">Connection String</label>
                <input
                    type="text"
                    bind:value={ledgerConnection}
                    placeholder="postgresql://localhost:5432/ledger"
                    class="w-full rounded-lg py-2 px-4 text-sm bg-gray-50 dark:text-gray-300 dark:bg-gray-850 outline-none"
                />
            </div>
        </div>
        
        <p class="text-xs text-gray-500">
            Optional persistence layer for findings and judgments. Sidecar works without a ledger.
        </p>
    </div>

    <hr class="dark:border-gray-850 my-3" />

    <!-- Webhook -->
    <div class="space-y-3">
        <div class="text-sm font-medium">Webhook (optional)</div>
        
        <div>
            <label class="block text-xs text-gray-500 mb-1">URL</label>
            <input
                type="url"
                bind:value={webhookUrl}
                placeholder="https://hooks.example.com/dora"
                class="w-full rounded-lg py-2 px-4 text-sm bg-gray-50 dark:text-gray-300 dark:bg-gray-850 outline-none"
            />
            <p class="text-xs text-gray-500 mt-1">Receive notifications for search and extraction events.</p>
        </div>
    </div>

    <!-- Actions -->
    <div class="flex justify-end space-x-3 pt-4">
        <button
            on:click={clearConfig}
            class="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
            Clear Configuration
        </button>
        <button
            on:click={saveConfig}
            class="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
            Save Configuration
        </button>
    </div>
</div>
