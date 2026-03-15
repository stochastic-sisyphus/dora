/**
 * Sidecar Configuration Store
 * 
 * Independent from Chat UI configuration.
 * Sidecar and Chat UI can connect to different servers.
 */

import { crossWindowWritable } from '$lib/stores';
import type { SidecarConfig } from './types';

// Sidecar configuration - all optional, works without any config
export const sidecarConfig = crossWindowWritable<SidecarConfig>('sidecar_config', {
    // No defaults - sidecar works ephemerally without configuration
});

// Helper: Check if sidecar has ledger configured
export function hasLedgerConfig(): boolean {
    return !!sidecarConfig.getConfig()?.ledger;
}

// Helper: Check if sidecar has search endpoint configured
export function hasSearchConfig(): boolean {
    return !!sidecarConfig.getConfig()?.searchEndpoint;
}

// Helper: Check if sidecar has LLM endpoint configured
export function hasLLMConfig(): boolean {
    return !!sidecarConfig.getConfig()?.llmEndpoint;
}

// Helper: Get effective search config (uses default if unconfigured)
export function getEffectiveSearchConfig() {
    const config = sidecarConfig.getConfig();
    return config?.searchEndpoint || {
        url: 'https://searx.be',
        method: 'GET',
        responsePath: 'results'
    };
}

// Helper: Get effective LLM config (undefined if unconfigured)
export function getEffectiveLLMConfig() {
    return sidecarConfig.getConfig()?.llmEndpoint;
}
