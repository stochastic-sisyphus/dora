/**
 * Universal Sidecar Client
 * 
 * Works standalone (ephemeral) or connected to a ledger (persistent).
 * No configuration required - uses sensible defaults when unconfigured.
 */

import type {
    SidecarConfig,
    SearchEndpoint,
    LLMEndpoint,
    SearchResults,
    SearchResult,
    Finding,
    SidecarRequest,
    SidecarResponse
} from './types';

// Default public search endpoint (used when unconfigured)
const DEFAULT_SEARCH: SearchEndpoint = {
    url: 'https://searx.be',
    method: 'GET',
    responsePath: 'results'
};

// Generate unique request IDs
let requestIdCounter = 0;
function generateRequestId(): string {
    return `sidecar-${Date.now()}-${++requestIdCounter}`;
}

/**
 * Universal search - works with or without configuration
 * 
 * @param query - Search query
 * @param config - Optional sidecar configuration
 * @param options - Optional per-request overrides
 */
export async function universalSearch(
    query: string,
    config?: SidecarConfig,
    options?: {
        endpoint?: SearchEndpoint;
        logToLedger?: boolean;
    }
): Promise<SearchResults> {
    const endpoint = options?.endpoint ?? config?.searchEndpoint ?? DEFAULT_SEARCH;
    
    try {
        // Build URL with query
        const url = new URL(endpoint.url);
        url.searchParams.set('q', query);
        url.searchParams.set('format', 'json');
        
        const response = await fetch(url.toString(), {
            method: endpoint.method || 'GET',
            headers: endpoint.headers
        });
        
        if (!response.ok) {
            throw new Error(`Search failed: ${response.status}`);
        }
        
        let data = await response.json();
        
        // Extract results at specified path
        if (endpoint.responsePath) {
            data = extractJsonPath(data, endpoint.responsePath);
        }
        
        const results: SearchResults = {
            query,
            results: Array.isArray(data) ? data.map(normalizeSearchResult) : [],
            logged: options?.logToLedger ?? false
        };
        
        // Log to ledger if configured and requested
        if (options?.logToLedger && config?.ledger) {
            await logToLedger({
                id: generateRequestId(),
                type: 'finding',
                fields: {
                    topic: query,
                    results: results.results
                },
                timestamp: Date.now(),
                source: 'sidecar-search'
            }, config.ledger);
            results.logged = true;
        }
        
        // Trigger webhook if configured
        if (config?.webhook) {
            await triggerWebhook({
                type: 'search',
                query,
                results: results.results
            }, config.webhook);
        }
        
        return results;
    } catch (error) {
        console.error('Sidecar search failed:', error);
        // Return empty results instead of throwing - sidecar should be resilient
        return {
            query,
            results: [],
            logged: false
        };
    }
}

/**
 * Universal LLM extraction - works with any OpenAI/Anthropic-compatible API
 * 
 * @param content - Content to analyze
 * @param config - Optional sidecar configuration
 * @param options - Optional per-request overrides
 */
export async function universalExtract(
    content: string,
    config?: SidecarConfig,
    options?: {
        endpoint?: LLMEndpoint;
        logToLedger?: boolean;
    }
): Promise<Finding | null> {
    const endpoint = options?.endpoint ?? config?.llmEndpoint;
    
    // If no endpoint configured, return null (graceful degradation)
    if (!endpoint) {
        return null;
    }
    
    try {
        const body = buildLLMRequestBody(content, endpoint);
        
        const response = await fetch(endpoint.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(endpoint.apiKey && {
                    'Authorization': `Bearer ${endpoint.apiKey}`
                }),
                ...endpoint.headers
            },
            body: JSON.stringify(body)
        });
        
        if (!response.ok) {
            throw new Error(`LLM request failed: ${response.status}`);
        }
        
        const data = await response.json();
        const finding = parseLLMResponse(data, endpoint.provider);
        
        // Log to ledger if configured
        if (options?.logToLedger && config?.ledger) {
            await logToLedger({
                id: generateRequestId(),
                type: 'finding',
                fields: finding,
                timestamp: Date.now(),
                source: 'sidecar-extract'
            }, config.ledger);
        }
        
        // Trigger webhook if configured
        if (config?.webhook) {
            await triggerWebhook({
                type: 'extract',
                finding
            }, config.webhook);
        }
        
        return finding;
    } catch (error) {
        console.error('Sidecar extraction failed:', error);
        return null;
    }
}

/**
 * Browse URL and render content
 */
export async function browseUrl(url: string): Promise<{
    title: string;
    content: string;
    screenshots?: string[];
}> {
    // For now, just return the URL - actual browsing would be handled by the sidecar process
    return {
        title: url,
        content: `Browsing: ${url}`
    };
}

/**
 * Render arbitrary content (artifacts, etc.)
 */
export async function renderContent(content: any, type: string): Promise<HTMLElement | null> {
    // Rendering is UI-specific - this is a placeholder for the view plug interface
    console.log(`Rendering ${type}:`, content);
    return null;
}

// Helper: Extract value at JSON path (e.g., "results.items")
function extractJsonPath(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
}

// Helper: Normalize search result to common format
function normalizeSearchResult(item: any): SearchResult {
    return {
        title: item.title || item.name || 'Untitled',
        url: item.url || item.link || '',
        snippet: item.content || item.snippet || '',
        score: item.score
    };
}

// Helper: Build LLM request body based on provider
function buildLLMRequestBody(content: string, endpoint: LLMEndpoint): any {
    const provider = endpoint.provider || 'custom';
    
    if (provider === 'anthropic') {
        return {
            model: endpoint.model || 'claude-3-haiku-20240307',
            max_tokens: 1024,
            system: endpoint.systemPrompt || 'You are a research analyst.',
            messages: [{
                role: 'user',
                content: content
            }]
        };
    }
    
    // OpenAI-compatible (default)
    return {
        model: endpoint.model || 'gpt-3.5-turbo',
        messages: [
            {
                role: 'system',
                content: endpoint.systemPrompt || 'You are a research analyst.'
            },
            {
                role: 'user',
                content: content
            }
        ],
        response_format: { type: 'json_object' }
    };
}

// Helper: Parse LLM response based on provider
function parseLLMResponse(data: any, provider?: string): Finding {
    let content: string;
    
    if (provider === 'anthropic') {
        content = data.content?.[0]?.text || '';
    } else {
        content = data.choices?.[0]?.message?.content || '';
    }
    
    try {
        const parsed = JSON.parse(content);
        return {
            topic: parsed.topic || 'Unknown',
            keyClaims: parsed.key_claims || [],
            consensus: parsed.consensus || '',
            contradictions: parsed.contradictions || [],
            knowledgeGaps: parsed.knowledge_gaps || [],
            searchQuality: parsed.search_quality || 'sparse',
            timestamp: Date.now()
        };
    } catch {
        // Return basic structure if JSON parsing fails
        return {
            topic: 'Extracted Content',
            keyClaims: [],
            consensus: content,
            contradictions: [],
            knowledgeGaps: [],
            searchQuality: 'sparse',
            timestamp: Date.now()
        };
    }
}

// Helper: Log entry to ledger (placeholder - actual implementation depends on ledger type)
async function logToLedger(entry: any, ledger: any): Promise<void> {
    console.log('Logging to ledger:', entry);
    // Actual implementation would connect to Temporal/Postgres/SQLite based on ledger.type
}

// Helper: Trigger webhook
async function triggerWebhook(payload: any, webhook: any): Promise<void> {
    try {
        await fetch(webhook.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...webhook.headers
            },
            body: JSON.stringify(payload)
        });
    } catch (error) {
        console.error('Webhook failed:', error);
    }
}
