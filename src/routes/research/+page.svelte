<script lang="ts">
	import {
		browseSidecar,
		extractSidecar,
		renderSidecar,
		searchSidecar
	} from '$lib/app/sidecar';
	import type {
		BrowseResult,
		Finding,
		RenderedContent,
		SearchResult
	} from '$lib/sidecar/types';

	let searchQuery = '';
	let searchResults: SearchResult[] = [];
	let searchLoading = false;
	let searchError = '';

	let activePage: BrowseResult | null = null;
	let browseLoading = false;
	let browseError = '';

	let extraction: Finding | null = null;
	let extractionLoading = false;
	let extractionError = '';

	let noteInput = '';
	let renderedNote: RenderedContent | null = null;
	let renderLoading = false;
	let renderError = '';

	async function handleSearch(): Promise<void> {
		if (!searchQuery.trim()) return;
		searchLoading = true;
		searchError = '';
		searchResults = [];

		try {
			const result = await searchSidecar(searchQuery.trim());
			searchResults = result.results ?? [];
		} catch (err) {
			searchError = err instanceof Error ? err.message : String(err);
		} finally {
			searchLoading = false;
		}
	}

	async function handleBrowse(url: string): Promise<void> {
		browseLoading = true;
		browseError = '';
		activePage = null;

		try {
			activePage = await browseSidecar(url);
		} catch (err) {
			browseError = err instanceof Error ? err.message : String(err);
		} finally {
			browseLoading = false;
		}
	}

	async function handleExtract(): Promise<void> {
		extractionLoading = true;
		extractionError = '';
		extraction = null;

		const content =
			activePage?.content ||
			searchResults
				.slice(0, 10)
				.map((result) => [result.title, result.url, result.snippet ?? ''].filter(Boolean).join('\n'))
				.join('\n\n---\n\n');

		if (!content.trim()) {
			extractionError = 'Search or browse something first.';
			extractionLoading = false;
			return;
		}

		try {
			extraction = await extractSidecar(content);
		} catch (err) {
			extractionError = err instanceof Error ? err.message : String(err);
		} finally {
			extractionLoading = false;
		}
	}

	async function handleRenderNote(): Promise<void> {
		renderLoading = true;
		renderError = '';
		renderedNote = null;

		if (!noteInput.trim()) {
			renderError = 'Enter some text to format.';
			renderLoading = false;
			return;
		}

		try {
			renderedNote = await renderSidecar(noteInput, 'note');
		} catch (err) {
			renderError = err instanceof Error ? err.message : String(err);
		} finally {
			renderLoading = false;
		}
	}
</script>

<div class="research-root">
	<div class="titlebar" data-tauri-drag-region></div>

	<main class="research-main">
		<section class="panel panel-search">
			<div class="panel-header">
				<h1>Navigator</h1>
				<p>Ephemeral research, browsing, and note shaping through the bundled sidecar.</p>
			</div>

			<div class="search-bar">
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Search the web"
					on:keydown={(event) => {
						if (event.key === 'Enter') handleSearch();
					}}
				/>
				<button class="btn btn-primary" on:click={handleSearch} disabled={searchLoading || !searchQuery.trim()}>
					{searchLoading ? 'Searching…' : 'Search'}
				</button>
			</div>

			<div class="toolbar">
				<button class="btn" on:click={handleExtract} disabled={extractionLoading}>
					{extractionLoading ? 'Extracting…' : 'Extract findings'}
				</button>
			</div>

			{#if searchError}
				<div class="error-msg">{searchError}</div>
			{/if}

			<div class="results">
				{#if searchResults.length > 0}
					{#each searchResults as result}
						<div class="result-card">
							<div class="result-meta">
								<a href={result.url} target="_blank" rel="noopener" class="result-title">
									{result.title}
								</a>
								<div class="result-url">{result.url}</div>
							</div>
							{#if result.snippet}
								<p class="result-content">{result.snippet}</p>
							{/if}
							<div class="result-actions">
								<button class="btn" on:click={() => handleBrowse(result.url)} disabled={browseLoading}>
									{browseLoading ? 'Loading…' : 'Read here'}
								</button>
								<a class="btn btn-link" href={result.url} target="_blank" rel="noopener">Open</a>
							</div>
						</div>
					{/each}
				{:else if !searchLoading}
					<p class="empty-state">Search results appear here. No core required.</p>
				{/if}
			</div>
		</section>

		<section class="panel-grid">
			<section class="panel">
				<div class="panel-header compact">
					<h2>Page Reader</h2>
					<p>Browse a result into an ephemeral reading surface.</p>
				</div>

				{#if browseError}
					<div class="error-msg">{browseError}</div>
				{/if}

				{#if activePage}
					<div class="reader">
						<h3>{activePage.title}</h3>
						<div class="reader-url">{activePage.url}</div>
						<pre>{activePage.content}</pre>
					</div>
				{:else}
					<p class="empty-state">Choose “Read here” on a result to fetch and inspect the page.</p>
				{/if}
			</section>

			<section class="panel">
				<div class="panel-header compact">
					<h2>Note Formatting</h2>
					<p>Paste rough text and let the sidecar format it into a cleaner note preview.</p>
				</div>

				<textarea
					bind:value={noteInput}
					rows="8"
					placeholder="Paste rough notes, snippets, or source text"
				></textarea>

				<div class="toolbar">
					<button class="btn" on:click={handleRenderNote} disabled={renderLoading}>
						{renderLoading ? 'Formatting…' : 'Format note'}
					</button>
				</div>

				{#if renderError}
					<div class="error-msg">{renderError}</div>
				{/if}

				{#if renderedNote}
					<div class="note-preview">
						<div class="note-stats">
							<span>{renderedNote.wordCount} words</span>
							<span>{renderedNote.lineCount} lines</span>
						</div>
						<pre>{renderedNote.preview}</pre>
					</div>
				{/if}
			</section>
		</section>

		<section class="panel">
			<div class="panel-header compact">
				<h2>Findings</h2>
				<p>The same surface can later render core-backed findings. Right now it works ephemerally.</p>
			</div>

			{#if extractionError}
				<div class="error-msg">{extractionError}</div>
			{/if}

			{#if extraction}
				<div class="extraction-panel">
					<div class="extraction-header">
						<h3>{extraction.topic}</h3>
						<span class="quality-badge quality-{extraction.searchQuality}">
							{extraction.searchQuality}
						</span>
					</div>

					<div class="extraction-section">
						<h4>Consensus</h4>
						<p>{extraction.consensus}</p>
					</div>

					{#if extraction.keyClaims.length > 0}
						<div class="extraction-section">
							<h4>Key Claims</h4>
							{#each extraction.keyClaims as claim}
								<div class="claim-card">
									<div class="claim-statement">{claim.statement}</div>
									<div class="claim-meta">
										<span class="confidence confidence-{claim.confidence}">{claim.confidence}</span>
										{#if claim.sourceUrl}
											<a href={claim.sourceUrl} target="_blank" rel="noopener" class="claim-source">
												{claim.sourceUrl}
											</a>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					{/if}

					{#if extraction.knowledgeGaps.length > 0}
						<div class="extraction-section">
							<h4>Knowledge Gaps</h4>
							<ul class="gaps-list">
								{#each extraction.knowledgeGaps as gap}
									<li>{gap}</li>
								{/each}
							</ul>
						</div>
					{/if}
				</div>
			{:else}
				<p class="empty-state">Run “Extract findings” after a search or browse step.</p>
			{/if}
		</section>
	</main>
</div>

<style>
	:root {
		--bg: #201817;
		--panel: #302624;
		--panel-2: #3b302d;
		--border: #5e4f4a;
		--muted: #b39b8f;
		--text: #f0e7dc;
		--accent: #9bb7b1;
		--accent-2: #d3a96c;
		--danger: #ff9b87;
	}

	.research-root {
		min-height: 100vh;
		background:
			radial-gradient(circle at top left, rgba(155, 183, 177, 0.12), transparent 30%),
			radial-gradient(circle at top right, rgba(211, 169, 108, 0.12), transparent 28%),
			linear-gradient(180deg, #201817 0%, #161010 100%);
		color: var(--text);
		font-family: 'Source Sans 3', 'Source Sans Pro', system-ui, sans-serif;
	}

	.titlebar {
		height: 32px;
	}

	.research-main {
		display: grid;
		gap: 16px;
		padding: 0 16px 16px;
	}

	.panel,
		.panel-grid {
		border: 1px solid rgba(240, 231, 220, 0.08);
		border-radius: 14px;
		background: rgba(48, 38, 36, 0.84);
		backdrop-filter: blur(10px);
	}

	.panel {
		padding: 16px;
	}

	.panel-search {
		padding-bottom: 10px;
	}

	.panel-grid {
		display: grid;
		gap: 16px;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		padding: 16px;
	}

	.panel-header h1,
	.panel-header h2 {
		margin: 0;
	}

	.panel-header p {
		margin: 4px 0 0;
		color: var(--muted);
		font-size: 0.92rem;
	}

	.panel-header.compact {
		margin-bottom: 12px;
	}

	.search-bar,
	.toolbar,
	.result-actions,
	.note-stats,
	.claim-meta,
	.extraction-header {
		display: flex;
		gap: 8px;
		align-items: center;
	}

	.search-bar {
		margin: 14px 0 10px;
	}

	input,
	textarea {
		width: 100%;
		background: var(--panel-2);
		color: var(--text);
		border: 1px solid var(--border);
		border-radius: 10px;
		padding: 10px 12px;
		outline: none;
	}

	textarea {
		resize: vertical;
		min-height: 170px;
	}

	input::placeholder,
	textarea::placeholder {
		color: #a48a7f;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border: 1px solid var(--border);
		border-radius: 999px;
		padding: 9px 14px;
		background: transparent;
		color: var(--text);
		text-decoration: none;
		cursor: pointer;
		white-space: nowrap;
	}

	.btn-primary {
		background: var(--accent);
		color: #1f1714;
		border-color: transparent;
	}

	.btn-link {
		color: var(--muted);
	}

	.results,
	.reader,
	.note-preview,
	.extraction-panel {
		display: grid;
		gap: 10px;
	}

	.result-card,
	.claim-card,
	.note-preview,
	.reader,
	.extraction-section {
		padding: 12px;
		border-radius: 12px;
		background: rgba(59, 48, 45, 0.6);
		border: 1px solid rgba(240, 231, 220, 0.06);
	}

	.result-title,
	.claim-source {
		color: var(--text);
		text-decoration: none;
	}

	.result-url,
	.reader-url,
	.note-stats,
	.confidence {
		color: var(--muted);
		font-size: 0.85rem;
	}

	.result-content,
	.extraction-section p,
	pre,
	.empty-state {
		margin: 0;
		color: #e1d6cc;
	}

	pre {
		white-space: pre-wrap;
		word-break: break-word;
		font-family: inherit;
	}

	.error-msg {
		padding: 10px 12px;
		border-radius: 10px;
		background: rgba(255, 155, 135, 0.14);
		color: var(--danger);
	}

	.quality-badge {
		padding: 4px 8px;
		border-radius: 999px;
		font-size: 0.8rem;
		background: rgba(155, 183, 177, 0.16);
		color: var(--accent);
	}

	.gaps-list {
		margin: 0;
		padding-left: 18px;
		color: #e1d6cc;
	}

	@media (max-width: 900px) {
		.panel-grid {
			grid-template-columns: 1fr;
		}

		.search-bar,
		.result-actions {
			flex-direction: column;
			align-items: stretch;
		}
	}
</style>
