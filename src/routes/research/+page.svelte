<script lang="ts">
	import { searchSearXNG, extractResearch, type ResearchExtraction } from '$lib/app/sidecar';
	import { appConfig } from '$lib/stores';

	let searchQuery = '';
	let searchResults: any[] = [];
	let searchLoading = false;
	let searchError = '';

	let extraction: ResearchExtraction | null = null;
	let extractionLoading = false;
	let extractionError = '';

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

	async function handleExtract(): Promise<void> {
		extractionLoading = true;
		extractionError = '';
		extraction = null;
		const apiKey = $appConfig?.substrate?.openrouterApiKey ?? '';
		if (!apiKey) {
			extractionError = 'OpenRouter API key not set. Add it in Desktop App settings.';
			extractionLoading = false;
			return;
		}
		let content = searchResults
			.slice(0, 10)
			.map((r: any) => `Source: ${r.url}\nTitle: ${r.title}\n${r.content ?? ''}`)
			.join('\n\n---\n\n');
		if (content.length > 30000) content = content.slice(0, 30000) + '\n\n[truncated]';
		try {
			extraction = await extractResearch(content, apiKey);
		} catch (err) {
			extractionError = err instanceof Error ? err.message : String(err);
		} finally {
			extractionLoading = false;
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

			{#if searchResults.length > 0}
				<div class="extract-bar">
					<button
						class="btn"
						on:click={handleExtract}
						disabled={extractionLoading}
					>
						{extractionLoading ? 'Extracting...' : 'Extract insights'}
					</button>
					{#if extractionError}
						<span class="error-inline">{extractionError}</span>
					{/if}
				</div>
			{/if}

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

			{#if extraction}
				<div class="extraction-panel">
					<div class="extraction-header">
						<h2>{extraction.topic}</h2>
						<span class="quality-badge quality-{extraction.search_quality}">
							{extraction.search_quality}
						</span>
					</div>

					<div class="extraction-section">
						<h3>Consensus</h3>
						<p>{extraction.consensus}</p>
					</div>

					{#if extraction.key_claims.length > 0}
						<div class="extraction-section">
							<h3>Key Claims</h3>
							{#each extraction.key_claims as claim}
								<div class="claim-card">
									<div class="claim-statement">{claim.statement}</div>
									<div class="claim-meta">
										<span class="confidence confidence-{claim.confidence}">{claim.confidence}</span>
										<a href={claim.source_url} target="_blank" rel="noopener" class="claim-source">{claim.source_url}</a>
									</div>
								</div>
							{/each}
						</div>
					{/if}

					{#if extraction.contradictions.length > 0}
						<div class="extraction-section">
							<h3>Contradictions</h3>
							{#each extraction.contradictions as c}
								<div class="contradiction-card">
									<div class="contradiction-claims">
										<span class="contra-a">{c.claim_a}</span>
										<span class="contra-vs">vs</span>
										<span class="contra-b">{c.claim_b}</span>
									</div>
									<div class="contra-note">{c.note}</div>
								</div>
							{/each}
						</div>
					{/if}

					{#if extraction.knowledge_gaps.length > 0}
						<div class="extraction-section">
							<h3>Knowledge Gaps</h3>
							<ul class="gaps-list">
								{#each extraction.knowledge_gaps as gap}
									<li>{gap}</li>
								{/each}
							</ul>
						</div>
					{/if}
				</div>
			{/if}
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

	/* Extract bar */
	.extract-bar {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 16px;
	}

	.error-inline {
		color: #e8a0a0;
		font-size: 0.8rem;
	}

	/* Extraction panel */
	.extraction-panel {
		margin-top: 24px;
		border-top: 1px solid var(--border);
		padding-top: 20px;
	}

	.extraction-header {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 16px;
	}

	.extraction-header h2 {
		font-family: 'EB Garamond', Georgia, serif;
		font-size: 1.3rem;
		color: var(--bright);
		margin: 0;
	}

	.quality-badge {
		font-size: 0.7rem;
		padding: 2px 8px;
		border-radius: 10px;
		text-transform: uppercase;
		font-weight: 600;
		letter-spacing: 0.05em;
	}

	.quality-rich { background: var(--accent1); color: var(--bg); }
	.quality-sparse { background: var(--muted-bg); color: var(--bright); }
	.quality-off_topic { background: #4a2020; color: #e8a0a0; }

	.extraction-section {
		margin-bottom: 16px;
	}

	.extraction-section h3 {
		font-family: 'EB Garamond', Georgia, serif;
		color: var(--muted-txt);
		margin: 0 0 8px 0;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		font-size: 0.8rem;
	}

	.extraction-section p {
		margin: 0;
		line-height: 1.6;
	}

	.claim-card {
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: 6px;
		padding: 10px 14px;
		margin-bottom: 8px;
	}

	.claim-statement {
		font-size: 0.9rem;
		margin-bottom: 6px;
	}

	.claim-meta {
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 0.75rem;
	}

	.confidence {
		padding: 1px 6px;
		border-radius: 4px;
		font-weight: 600;
		text-transform: uppercase;
		font-size: 0.65rem;
	}

	.confidence-high { background: var(--accent1); color: var(--bg); }
	.confidence-medium { background: var(--accent2); color: var(--bg); }
	.confidence-low { background: var(--muted-bg); color: var(--bright); }

	.claim-source {
		color: var(--muted-txt);
		text-decoration: none;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 300px;
	}

	.claim-source:hover { text-decoration: underline; }

	.contradiction-card {
		background: var(--panel);
		border: 1px solid var(--border);
		border-left: 3px solid #e8a0a0;
		border-radius: 6px;
		padding: 10px 14px;
		margin-bottom: 8px;
	}

	.contradiction-claims {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
		margin-bottom: 6px;
		font-size: 0.85rem;
	}

	.contra-vs {
		color: var(--muted-txt);
		font-style: italic;
		font-size: 0.75rem;
	}

	.contra-note {
		font-size: 0.8rem;
		color: var(--muted-txt);
		font-style: italic;
	}

	.gaps-list {
		margin: 0;
		padding-left: 20px;
	}

	.gaps-list li {
		font-size: 0.85rem;
		margin-bottom: 4px;
		line-height: 1.5;
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
