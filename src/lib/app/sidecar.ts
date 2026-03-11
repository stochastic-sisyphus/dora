import { invoke } from '@tauri-apps/api/core';

export async function searchSearXNG(
	query: string,
	baseUrl: string = 'https://search.schrodingers.lol'
): Promise<any> {
	return invoke('searxng_search', { query, baseUrl });
}

export interface Claim {
	statement: string;
	source_url: string;
	confidence: 'high' | 'medium' | 'low';
}

export interface Contradiction {
	claim_a: string;
	claim_b: string;
	note: string;
}

export interface ResearchExtraction {
	topic: string;
	key_claims: Claim[];
	consensus: string;
	contradictions: Contradiction[];
	knowledge_gaps: string[];
	search_quality: 'rich' | 'sparse' | 'off_topic';
}

export async function extractResearch(
	content: string,
	openrouterApiKey: string
): Promise<ResearchExtraction> {
	return invoke('extract_research', { content, openrouterApiKey });
}
