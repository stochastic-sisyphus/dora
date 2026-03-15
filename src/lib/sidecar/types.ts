/**
 * Universal Sidecar Types
 * 
 * The sidecar works standalone or connected to a ledger.
 * Configuration is optional and independent from Chat UI config.
 */

// Sidecar configuration - all optional
export interface SidecarConfig {
    // Search endpoint (any search API)
    searchEndpoint?: SearchEndpoint;
    
    // LLM endpoint (any OpenAI/Anthropic-compatible API)
    llmEndpoint?: LLMEndpoint;
    
    // Ledger connection (optional persistence)
    ledger?: LedgerConfig;
    
    // Webhook for notifications (optional)
    webhook?: WebhookConfig;
}

// Search endpoint configuration
export interface SearchEndpoint {
    url: string;
    method?: 'GET' | 'POST';
    headers?: Record<string, string>;
    bodyTemplate?: string;
    responsePath?: string;
}

// LLM endpoint configuration
export interface LLMEndpoint {
    url: string;
    apiKey?: string;
    model?: string;
    provider?: 'openai' | 'anthropic' | 'custom';
    systemPrompt?: string;
}

// Ledger configuration (optional persistence)
export interface LedgerConfig {
    type: 'temporal' | 'postgres' | 'sqlite' | 'custom';
    connection: string;
}

// Webhook configuration
export interface WebhookConfig {
    url: string;
    events?: string[];
    headers?: Record<string, string>;
}

// Ledger entry types
export type LedgerEntryType = 'finding' | 'judgment' | 'observation' | 'artifact';

export interface LedgerEntry {
    id: string;
    type: LedgerEntryType;
    fields: Record<string, any>;
    timestamp: number;
    source: string;
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

// IPC message types
export interface SidecarRequest {
    id: string;
    type: 'search' | 'extract' | 'browse' | 'render' | 'log' | 'query';
    payload: any;
    config?: SidecarConfig;
}

export interface SidecarResponse {
    id: string;
    type: 'results' | 'error' | 'logged' | 'rendered';
    data?: any;
    error?: string;
}
