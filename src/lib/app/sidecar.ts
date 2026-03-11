import { invoke } from '@tauri-apps/api/core';

export async function searchSearXNG(
	query: string,
	baseUrl: string = 'https://search.schrodingers.lol'
): Promise<any> {
	return invoke('searxng_search', { query, baseUrl });
}
