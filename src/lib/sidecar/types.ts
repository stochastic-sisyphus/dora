/**
 * Universal Sidecar Types
 * 
 * The sidecar works standalone or connected to an optional core backend.
 * Configuration is optional and independent from Chat UI config.
 */

// Sidecar configuration - all optional
export interface SidecarConfig {
    // Search endpoint (any search API)
    searchEndpoint?: SearchEndpoint;
    
    // LLM endpoint (any OpenAI/Anthropic-compatible API)
    llmEndpoint?: LLMEndpoint;
    
    // Core endpoint (optional persistence / validation chokepoint)
    core?: CoreEndpoint;
    
    // Webhook for notifications (optional)
    webhook?: WebhookConfig;
}

// Search endpoint configuration
export interface SearchEndpoint {
    url: string;
    method?: 'GET' | 'POST';
    headers?: Record<string, string>;
    bodyTemplate?: string;  // Use {{query}} as placeholder
    responsePath?: string;  // JSON path like "results" or "data.items"
}

// LLM endpoint configuration
export interface LLMEndpoint {
    url: string;
    apiKey?: string;
    model?: string;
    provider?: 'openai' | 'anthropic' | 'custom';
    systemPrompt?: string;
    headers?: Record<string, string>;
}

export interface CoreEndpoint {
    url: string;
    apiKey?: string;
    headers?: Record<string, string>;
}

// Webhook configuration
export interface WebhookConfig {
    url: string;
    events?: string[];
    headers?: Record<string, string>;
}

// Ledger entry types (the atoms)
export type LedgerEntryType = 'finding' | 'judgment' | 'observation' | 'artifact';

export interface LedgerEntry {
    id: string;
    type: LedgerEntryType;
    fields: Record<string, any>;  // Pydantic-shaped
    timestamp: number;
    source: string;  // Which entry plug
}

// Region query for view plugs
export interface RegionQuery {
    type: string;
    predicates: Record<string, any>;
    temporalRange?: {
        from?: number;
        to?: number;
    };
    calibration?: Record<string, any>;
}

// Judgment types for entry plugs
export interface Judgment {
    type: string;
    fields: Record<string, any>;
    timestamp: number;
}

// Finding type
export interface Finding {
    topic: string;
    keyClaims: Claim[];
    consensus: string;
    contradictions: Contradiction[];
    knowledgeGaps: string[];
    searchQuality: 'rich' | 'sparse' | 'off_topic';
    timestamp?: number;
}

export interface Claim {
    statement: string;
    sourceUrl: string;
    confidence: 'high' | 'medium' | 'low';
}

export interface Contradiction {
    claimA: string;
    claimB: string;
    note: string;
}

// Search results
export interface SearchResults {
    query: string;
    results: SearchResult[];
    logged?: boolean;
}

export interface SearchResult {
    title: string;
    url: string;
    snippet?: string;
    score?: number;
}

export interface BrowseResult {
    url: string;
    title: string;
    content: string;
    excerpt?: string;
}

export interface RenderedContent {
    type: string;
    content: string;
    preview: string;
    wordCount: number;
    lineCount: number;
}

// IPC message types (stdin/stdout protocol)
export interface SidecarRequest {
    id: string;
    type: 'search' | 'extract' | 'browse' | 'render' | 'ping';
    payload: any;
    config?: SidecarConfig;
}

export interface SidecarResponse {
    id: string;
    type: 'results' | 'error';
    data?: any;
    error?: string;
}
