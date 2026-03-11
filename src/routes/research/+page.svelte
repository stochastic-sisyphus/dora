<script lang="ts">
	import { searchSearXNG } from '$lib/app/sidecar';
	import { appConfig } from '$lib/stores';

	let searchQuery = '';
	let searchResults: any[] = [];
	let searchLoading = false;
	let searchError = '';

	async function handleSearch(): Promise<void> {
		if (!searchQuery.trim()) return;
		searchLoading = true;
		searchError = '';
		searchResults = [];

		try {
			const baseUrl = $appConfig?.substrate?.searxngUrl || 'https://search.schrodingers.lol';
			const result = await searchSearXNG(searchQuery, baseUrl);
			searchResults = result?.results ?? [];
		} catch (err) {
			searchError = err instanceof Error ? err.message : String(err);
		} finally {
			searchLoading = false;
		}
	}
</script>

<div class="research-root">
	<!-- Title bar drag region -->
	<div class="titlebar" data-tauri-drag-region></div>

	<main class="research-main">
		<div class="panel">
			<div class="search-bar">
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Search with SearXNG..."
					on:keydown={(e) => { if (e.key === 'Enter') handleSearch(); }}
				/>
				<button
					class="btn btn-primary"
					on:click={handleSearch}
					disabled={searchLoading || !searchQuery.trim()}
				>
					{searchLoading ? 'Searching...' : 'Search'}
				</button>
			</div>

			{#if searchError}
				<div class="error-msg">{searchError}</div>
			{/if}

			<div class="results">
				{#each searchResults as result}
					<div class="result-card">
						<a href={result.url} target="_blank" rel="noopener" class="result-title">
							{result.title}
						</a>
						<div class="result-url">{result.url}</div>
						{#if result.content}
							<p class="result-content">{result.content}</p>
						{/if}
					</div>
				{/each}

				{#if searchResults.length === 0 && !searchLoading && !searchError}
					<p class="empty-state">Enter a query and click Search.</p>
				{/if}
			</div>
		</div>
	</main>
</div>

<style>
	:root {
		--bg: #2A1B16;
		--panel: #40312F;
		--border: #51504B;
		--muted-bg: #605E5C;
		--muted-txt: #A68A7B;
		--text: #CABAB0;
		--bright: #DCCCBD;
		--accent1: #778C89;
		--accent2: #A0A598;
	}

	.research-root {
		background: var(--bg);
		color: var(--text);
		font-family: 'Source Sans 3', 'Source Sans Pro', system-ui, sans-serif;
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	.titlebar {
		height: 32px;
		flex-shrink: 0;
	}

	.research-main {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.panel {
		flex: 1;
		overflow-y: auto;
		padding: 16px;
	}

	/* Search */
	.search-bar {
		display: flex;
		gap: 8px;
		margin-bottom: 16px;
	}

	.search-bar input {
		flex: 1;
	}

	input {
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: 6px;
		color: var(--text);
		padding: 8px 12px;
		font-size: 0.9rem;
		font-family: 'Source Sans 3', 'Source Sans Pro', system-ui, sans-serif;
		outline: none;
		transition: border-color 0.15s;
	}

	input:focus {
		border-color: var(--accent1);
	}

	input::placeholder {
		color: var(--muted-txt);
	}

	/* Buttons */
	.btn {
		padding: 8px 16px;
		border: 1px solid var(--border);
		border-radius: 6px;
		background: var(--panel);
		color: var(--text);
		cursor: pointer;
		font-size: 0.85rem;
		font-family: 'Source Sans 3', 'Source Sans Pro', system-ui, sans-serif;
		transition: background 0.15s, border-color 0.15s;
		white-space: nowrap;
	}

	.btn:hover {
		background: var(--border);
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-primary {
		background: var(--accent1);
		border-color: var(--accent1);
		color: var(--bg);
		font-weight: 600;
	}

	.btn-primary:hover {
		background: var(--accent2);
		border-color: var(--accent2);
	}

	/* Results */
	.results {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.result-card {
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 12px 16px;
	}

	.result-title {
		color: var(--accent1);
		font-size: 1rem;
		font-weight: 600;
		text-decoration: none;
		display: block;
		margin-bottom: 4px;
	}

	.result-title:hover {
		text-decoration: underline;
	}

	.result-url {
		font-size: 0.75rem;
		color: var(--muted-txt);
		margin-bottom: 6px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.result-content {
		font-size: 0.85rem;
		color: var(--text);
		margin: 0;
		line-height: 1.5;
	}

	.error-msg {
		background: #4a2020;
		border: 1px solid #6b3030;
		color: #e8a0a0;
		padding: 8px 12px;
		border-radius: 6px;
		margin-bottom: 12px;
		font-size: 0.85rem;
	}

	.empty-state {
		color: var(--muted-txt);
		text-align: center;
		padding: 32px 16px;
		font-size: 0.9rem;
	}

	/* Scrollbar styling */
	::-webkit-scrollbar {
		width: 6px;
	}

	::-webkit-scrollbar-track {
		background: transparent;
	}

	::-webkit-scrollbar-thumb {
		background: var(--border);
		border-radius: 3px;
	}

	::-webkit-scrollbar-thumb:hover {
		background: var(--muted-bg);
	}
</style>
