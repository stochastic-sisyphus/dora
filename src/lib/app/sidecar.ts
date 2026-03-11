import { invoke, Channel } from '@tauri-apps/api/core';

export interface InquiryRow {
	id: number;
	question: string;
	status: string;
	finding_count: number;
}

export interface InquiryResult {
	inquiry: InquiryRow;
	findings: any[];
	gaps: any[];
}

export async function runFabric(
	pattern: string,
	input: string,
	onChunk: (line: string) => void
): Promise<void> {
	const channel = new Channel<string>();
	channel.onmessage = onChunk;
	await invoke('run_fabric', { pattern, input, onChunk: channel });
}

export async function listFabricPatterns(): Promise<string[]> {
	return invoke('list_fabric_patterns');
}

export async function inquiryList(): Promise<InquiryRow[]> {
	return invoke('inquiry_list');
}

export async function inquiryAsk(question: string): Promise<InquiryResult> {
	return invoke('inquiry_ask', { question });
}

export async function inquiryShow(id: number): Promise<InquiryResult> {
	return invoke('inquiry_show', { id });
}

export async function inquiryDig(id: number): Promise<InquiryResult> {
	return invoke('inquiry_dig', { id });
}

export async function searchSearXNG(
	query: string,
	baseUrl: string = 'https://search.schrodingers.lol'
): Promise<any> {
	return invoke('searxng_search', { query, baseUrl });
}
