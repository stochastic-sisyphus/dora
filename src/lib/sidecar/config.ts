/**
 * Sidecar Configuration Store
 * 
 * Independent from Chat UI configuration.
 * Sidecar and Chat UI can connect to different servers.
 */

import { crossWindowWritable } from '$lib/stores/cross-window-writable';
import { get } from 'svelte/store';
import type { SidecarConfig } from './types';

// Sidecar configuration - all optional, works without any config
export const sidecarConfig = crossWindowWritable<SidecarConfig>('sidecar_config', {
    // No defaults - sidecar works ephemerally without configuration
});

// Helper: Check if sidecar has a core endpoint configured
export function hasCoreConfig(): boolean {
    const config = (get(sidecarConfig) ?? {}) as SidecarConfig;
    return !!config.core;
}

// Helper: Check if sidecar has search endpoint configured
export function hasSearchConfig(): boolean {
    const config = (get(sidecarConfig) ?? {}) as SidecarConfig;
    return !!config.searchEndpoint;
}

// Helper: Check if sidecar has LLM endpoint configured
export function hasLLMConfig(): boolean {
    const config = (get(sidecarConfig) ?? {}) as SidecarConfig;
    return !!config.llmEndpoint;
}

// Helper: Get effective search config
export function getEffectiveSearchConfig() {
    const config = (get(sidecarConfig) ?? {}) as SidecarConfig;
    return config.searchEndpoint;
}

// Helper: Get effective LLM config (undefined if unconfigured)
export function getEffectiveLLMConfig() {
    const config = (get(sidecarConfig) ?? {}) as SidecarConfig;
    return config.llmEndpoint;
}
