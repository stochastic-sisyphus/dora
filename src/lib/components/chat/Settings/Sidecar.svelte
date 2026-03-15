<script lang="ts">
    import { sidecarConfig } from '$lib/sidecar/config';
    import type { SidecarConfig, LedgerConfig } from '$lib/sidecar/types';
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
    
    // Universal ledger config
    let ledgerType = '';
    let ledgerConnection = '';
    let ledgerAuthType: 'none' | 'bearer' | 'basic' | 'apikey' | 'custom' = 'none';
    let ledgerAuthToken = '';
    let ledgerAuthUsername = '';
    let ledgerAuthPassword = '';
    let ledgerAuthApiKey = '';
    
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
            if (config.ledger.auth) {
                ledgerAuthType = config.ledger.auth.type || 'none';
                ledgerAuthToken = config.ledger.auth.token || '';
                ledgerAuthUsername = config.ledger.auth.username || '';
                ledgerAuthPassword = config.ledger.auth.password || '';
                ledgerAuthApiKey = config.ledger.auth.apiKey || '';
            }
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
        
        // Save ledger if type provided
        if (ledgerType && ledgerConnection) {
            const ledger: LedgerConfig = {
                type: ledgerType,
                connection: ledgerConnection
            };
            
            // Add auth if configured
            if (ledgerAuthType !== 'none') {
                ledger.auth = { type: ledgerAuthType };
                if (ledgerAuthType === 'bearer' && ledgerAuthToken) {
                    ledger.auth.token = ledgerAuthToken;
                } else if (ledgerAuthType === 'basic' && ledgerAuthUsername && ledgerAuthPassword) {
                    ledger.auth.username = ledgerAuthUsername;
                    ledger.auth.password = ledgerAuthPassword;
                } else if (ledgerAuthType === 'apikey' && ledgerAuthApiKey) {
                    ledger.auth.apiKey = ledgerAuthApiKey;
                }
            }
            
            config.ledger = ledger;
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
        ledgerType = '';
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
            Universal configuration for search, LLM, and ledger backends.
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
            <p class="text-xs text-gray-500 mt-1">Any search API endpoint.</p>
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

    <!-- Universal Ledger -->
    <div class="space-y-3">
        <div class="text-sm font-medium">Ledger Backend (optional)</div>
        <p class="text-xs text-gray-500">
            Any backend implementing the ledger protocol. SQLite, PostgreSQL, or custom adapters.
        </p>
        
        <div class="grid grid-cols-2 gap-4">
            <div>
                <label class="block text-xs text-gray-500 mb-1">Backend Type</label>
                <input
                    type="text"
                    bind:value={ledgerType}
                    placeholder="sqlite, postgres, custom-adapter"
                    class="w-full rounded-lg py-2 px-4 text-sm bg-gray-50 dark:text-gray-300 dark:bg-gray-850 outline-none"
                />
            </div>
            
            <div>
                <label class="block text-xs text-gray-500 mb-1">Connection</label>
                <input
                    type="text"
                    bind:value={ledgerConnection}
                    placeholder="file:///path/to.db or postgresql://..."
                    class="w-full rounded-lg py-2 px-4 text-sm bg-gray-50 dark:text-gray-300 dark:bg-gray-850 outline-none"
                />
            </div>
        </div>
        
        <!-- Auth Configuration -->
        <div class="border-t border-gray-200 dark:border-gray-800 pt-3">
            <div class="text-xs font-medium mb-2">Authentication (optional)</div>
            
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs text-gray-500 mb-1">Auth Type</label>
                    <select
                        bind:value={ledgerAuthType}
                        class="w-full rounded-lg py-2 px-4 text-sm bg-gray-50 dark:text-gray-300 dark:bg-gray-850 outline-none"
                    >
                        <option value="none">None</option>
                        <option value="bearer">Bearer Token</option>
                        <option value="basic">Basic Auth</option>
                        <option value="apikey">API Key</option>
                        <option value="custom">Custom Headers</option>
                    </select>
                </div>
                
                {#if ledgerAuthType === 'bearer'}
                    <div class="col-span-2">
                        <label class="block text-xs text-gray-500 mb-1">Token</label>
                        <input
                            type="password"
                            bind:value={ledgerAuthToken}
                            placeholder="Bearer token"
                            class="w-full rounded-lg py-2 px-4 text-sm bg-gray-50 dark:text-gray-300 dark:bg-gray-850 outline-none"
                        />
                    </div>
                {:else if ledgerAuthType === 'basic'}
                    <div>
                        <label class="block text-xs text-gray-500 mb-1">Username</label>
                        <input
                            type="text"
                            bind:value={ledgerAuthUsername}
                            class="w-full rounded-lg py-2 px-4 text-sm bg-gray-50 dark:text-gray-300 dark:bg-gray-850 outline-none"
                        />
                    </div>
                    <div>
                        <label class="block text-xs text-gray-500 mb-1">Password</label>
                        <input
                            type="password"
                            bind:value={ledgerAuthPassword}
                            class="w-full rounded-lg py-2 px-4 text-sm bg-gray-50 dark:text-gray-300 dark:bg-gray-850 outline-none"
                        />
                    </div>
                {:else if ledgerAuthType === 'apikey'}
                    <div class="col-span-2">
                        <label class="block text-xs text-gray-500 mb-1">API Key</label>
                        <input
                            type="password"
                            bind:value={ledgerAuthApiKey}
                            class="w-full rounded-lg py-2 px-4 text-sm bg-gray-50 dark:text-gray-300 dark:bg-gray-850 outline-none"
                        />
                    </div>
                {/if}
            </div>
        </div>
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
