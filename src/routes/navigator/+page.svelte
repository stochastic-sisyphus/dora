<script lang="ts">
	import { IS_TAURI } from '$lib/constants';
	import { onMount } from 'svelte';

	// --- State ---
	let query = '';
	let loading = false;
	let results: any[] = [];
	let activeCategory = 'general';
	let counterResults: any[] = [];
	let showCounter = false;
	let error = '';

	const categories = [
		{ id: 'general', label: 'All' },
		{ id: 'social_media', label: 'Social' },
		{ id: 'science', label: 'Science' },
		{ id: 'news', label: 'News' },
		{ id: 'it', label: 'Dev' },
		{ id: 'images', label: 'Images' }
	];

	// --- Search ---
	async function doSearch() {
		if (!query.trim()) return;
		loading = true;
		error = '';
		results = [];
		counterResults = [];
		showCounter = false;

		try {
			const data = await searchSearxng(query, activeCategory);
			results = data.results || [];

			// Fire counter-search in background
			fireCounterSearch(query);
		} catch (e: any) {
			error = e.message || 'Search failed';
		} finally {
			loading = false;
		}
	}

	async function fireCounterSearch(q: string) {
		try {
			const negation = `"problems with" OR "criticism of" OR "downsides" ${q}`;
			const data = await searchSearxng(negation, 'general');
			counterResults = data.results || [];
		} catch {
			// Counter-search is best-effort
		}
	}

	async function searchSearxng(q: string, cats: string): Promise<any> {
		if (IS_TAURI) {
			const { invoke } = await import('@tauri-apps/api/core');
			const raw = await invoke('searxng_search', {
				query: q,
				categories: cats
			}) as string;
			if (raw.trimStart().startsWith('<')) {
				throw new Error('Search returned auth page — SearXNG bypass not configured');
			}
			try {
				return JSON.parse(raw);
			} catch {
				throw new Error(`Invalid JSON from SearXNG: ${raw.slice(0, 100)}`);
			}
		}
		const resp = await fetch(
			`https://search.schrodingers.lol/search?q=${encodeURIComponent(q)}&format=json&categories=${cats}`
		);
		if (!resp.ok) {
			throw new Error(`Search failed: ${resp.status}`);
		}
		const text = await resp.text();
		if (text.trimStart().startsWith('<')) {
			throw new Error('Search returned auth page instead of JSON');
		}
		return JSON.parse(text);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') doSearch();
	}

	// --- Shape detection (from SearXNG template field) ---
	function detectShape(result: any): string {
		if (result.template === 'videos.html') return 'video';
		if (result.template === 'images.html' || result.img_src) return 'image';
		if (result.template === 'key-value.html') return 'infobox';
		if (result.template === 'papers.html' || result.doi || result.issn) return 'academic';
		if (result.template === 'code.html' || result.is_answered !== undefined) return 'code';
		if (result.publishedDate || result.template === 'news.html') return 'news';
		return 'general';
	}

	function engineBadges(result: any): string[] {
		return result.engines || [];
	}

	function formatDate(dateStr: string): string {
		try {
			return new Date(dateStr).toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
				year: 'numeric'
			});
		} catch {
			return dateStr;
		}
	}

	function domainFromUrl(url: string): string {
		try {
			return new URL(url).hostname.replace('www.', '');
		} catch {
			return url;
		}
	}

	onMount(() => {
		// Focus search input on mount
		const input = document.getElementById('nav-search');
		input?.focus();
	});
</script>

<div class="navigator-root">
	<!-- Search bar -->
	<div class="search-bar">
		<div class="search-input-wrap">
			<svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<circle cx="11" cy="11" r="8" />
				<path d="m21 21-4.35-4.35" />
			</svg>
			<input
				id="nav-search"
				type="text"
				bind:value={query}
				on:keydown={handleKeydown}
				placeholder="Search across sources..."
				class="search-input"
			/>
			{#if query}
				<button class="clear-btn" on:click={() => { query = ''; results = []; }}>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
						<path d="M18 6 6 18M6 6l12 12" />
					</svg>
				</button>
			{/if}
		</div>
	</div>

	<!-- Category tabs -->
	<div class="category-tabs">
		{#each categories as cat}
			<button
				class="tab"
				class:active={activeCategory === cat.id}
				on:click={() => { activeCategory = cat.id; if (query) doSearch(); }}
			>
				{cat.label}
			</button>
		{/each}

		{#if counterResults.length > 0}
			<button
				class="tab counter-tab"
				class:active={showCounter}
				on:click={() => { showCounter = !showCounter; }}
			>
				Counterpoint ({counterResults.length})
			</button>
		{/if}
	</div>

	<!-- Results area -->
	<div class="results-area">
		{#if loading}
			<div class="loading">
				<div class="spinner"></div>
				<span>Searching...</span>
			</div>
		{:else if error}
			<div class="error-msg">{error}</div>
		{:else if results.length === 0 && query}
			<div class="empty">No results found.</div>
		{:else if !query}
			<div class="empty hint">
				<p>Search across SearXNG sources.</p>
				<p class="hint-sub">Categories: general, social, science, news, dev, images</p>
			</div>
		{/if}

		{#each (showCounter ? counterResults : results) as result, i}
			{@const shape = detectShape(result)}
			<div class="result-card" class:single-engine={engineBadges(result).length === 1}>
				<!-- Header: title + domain -->
				<div class="result-header">
					<a href={result.url} target="_blank" rel="noopener" class="result-title">
						{result.title || 'Untitled'}
					</a>
					<span class="result-domain">{domainFromUrl(result.url)}</span>
				</div>

				<!-- Content varies by shape -->
				{#if result.content}
					<p class="result-content">{result.content}</p>
				{/if}

				{#if shape === 'academic'}
					<div class="result-meta academic-meta">
						{#if result.authors}
							<span class="meta-item">by {result.authors.join(', ')}</span>
						{/if}
						{#if result.doi}
							<span class="meta-item doi">DOI: {result.doi}</span>
						{/if}
						{#if result.publishedDate}
							<span class="meta-item">{formatDate(result.publishedDate)}</span>
						{/if}
					</div>
				{:else if shape === 'image' && result.img_src}
					<div class="image-thumb">
						<img src={result.img_src} alt={result.title} loading="lazy" />
					</div>
				{:else if shape === 'video' && result.thumbnail}
					<div class="video-thumb">
						<img src={result.thumbnail} alt={result.title} loading="lazy" />
						{#if result.length}
							<span class="duration">{result.length}</span>
						{/if}
					</div>
				{:else if shape === 'code'}
					<div class="result-meta code-meta">
						{#if result.is_answered !== undefined}
							<span class="meta-item" class:answered={result.is_answered}>
								{result.is_answered ? 'Answered' : 'Unanswered'}
							</span>
						{/if}
					</div>
				{:else if shape === 'news' && result.publishedDate}
					<div class="result-meta">
						<span class="meta-item">{formatDate(result.publishedDate)}</span>
						{#if result.source}
							<span class="meta-item source">{result.source}</span>
						{/if}
					</div>
				{/if}

				<!-- Engine badges -->
				<div class="engine-badges">
					{#each engineBadges(result) as engine}
						<span class="badge">{engine}</span>
					{/each}
				</div>
			</div>
		{/each}
	</div>
</div>

<style>
	/* Embers palette */
	:root {
		--bg: #16130f;
		--panel: #2c2620;
		--border: #433b32;
		--muted-bg: #5a5047;
		--muted-txt: #8a8075;
		--text: #a39a90;
		--bright: #beb6ae;
		--brightest: #dbd6d1;
		--teal: #69AAB2;
		--rose: #C6C2D2;
		--purple: #5C5A72;
		--olive: #46696B;
		--brown: #5C4543;
		--steel: #AEBDC7;
	}

	.navigator-root {
		display: flex;
		flex-direction: column;
		height: 100vh;
		background: var(--bg);
		color: var(--text);
		font-family: 'Inter', system-ui, sans-serif;
		overflow: hidden;
	}

	/* Search bar */
	.search-bar {
		padding: 12px 16px 8px;
		flex-shrink: 0;
	}

	.search-input-wrap {
		display: flex;
		align-items: center;
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: 10px;
		padding: 0 12px;
		gap: 8px;
		transition: border-color 0.15s;
	}

	.search-input-wrap:focus-within {
		border-color: var(--teal);
	}

	.search-icon {
		width: 18px;
		height: 18px;
		color: var(--muted-txt);
		flex-shrink: 0;
	}

	.search-input {
		flex: 1;
		background: transparent;
		border: none;
		outline: none;
		color: var(--brightest);
		font-size: 14px;
		padding: 10px 0;
		font-family: inherit;
	}

	.search-input::placeholder {
		color: var(--muted-txt);
	}

	.clear-btn {
		background: none;
		border: none;
		color: var(--muted-txt);
		cursor: pointer;
		padding: 4px;
		display: flex;
		align-items: center;
	}

	.clear-btn:hover {
		color: var(--bright);
	}

	/* Category tabs */
	.category-tabs {
		display: flex;
		gap: 2px;
		padding: 0 16px 8px;
		flex-shrink: 0;
		overflow-x: auto;
	}

	.tab {
		background: transparent;
		border: none;
		color: var(--muted-txt);
		font-size: 12px;
		font-family: inherit;
		padding: 5px 12px;
		border-radius: 6px;
		cursor: pointer;
		white-space: nowrap;
		transition: all 0.15s;
	}

	.tab:hover {
		color: var(--bright);
		background: var(--panel);
	}

	.tab.active {
		color: var(--brightest);
		background: var(--panel);
		border: 1px solid var(--border);
	}

	.counter-tab {
		color: var(--rose);
		margin-left: auto;
	}

	.counter-tab.active {
		color: var(--brightest);
		background: var(--brown);
		border-color: var(--brown);
	}

	/* Results */
	.results-area {
		flex: 1;
		overflow-y: auto;
		padding: 0 16px 16px;
	}

	.results-area::-webkit-scrollbar {
		width: 6px;
	}

	.results-area::-webkit-scrollbar-track {
		background: transparent;
	}

	.results-area::-webkit-scrollbar-thumb {
		background: var(--border);
		border-radius: 3px;
	}

	.loading {
		display: flex;
		align-items: center;
		gap: 10px;
		color: var(--muted-txt);
		padding: 24px 0;
		justify-content: center;
	}

	.spinner {
		width: 16px;
		height: 16px;
		border: 2px solid var(--border);
		border-top-color: var(--teal);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.error-msg {
		color: var(--rose);
		padding: 16px;
		text-align: center;
	}

	.empty {
		color: var(--muted-txt);
		text-align: center;
		padding: 48px 16px;
	}

	.hint p {
		margin: 0 0 6px;
	}

	.hint-sub {
		font-size: 12px;
		color: var(--muted-bg);
	}

	/* Result cards */
	.result-card {
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 12px 14px;
		margin-bottom: 8px;
		transition: border-color 0.15s;
	}

	.result-card:hover {
		border-color: var(--muted-bg);
	}

	.result-card.single-engine {
		border-left: 2px solid var(--rose);
	}

	.result-header {
		display: flex;
		align-items: baseline;
		gap: 8px;
		margin-bottom: 4px;
	}

	.result-title {
		color: var(--teal);
		text-decoration: none;
		font-size: 14px;
		font-weight: 500;
		line-height: 1.3;
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.result-title:hover {
		text-decoration: underline;
	}

	.result-domain {
		color: var(--muted-txt);
		font-size: 11px;
		flex-shrink: 0;
	}

	.result-content {
		color: var(--text);
		font-size: 13px;
		line-height: 1.5;
		margin: 0 0 6px;
		display: -webkit-box;
		-webkit-line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.result-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-bottom: 6px;
	}

	.meta-item {
		font-size: 11px;
		color: var(--muted-txt);
	}

	.meta-item.doi {
		color: var(--steel);
	}

	.meta-item.source {
		color: var(--olive);
		font-weight: 500;
	}

	.meta-item.answered {
		color: var(--olive);
	}

	.image-thumb img,
	.video-thumb img {
		max-width: 100%;
		max-height: 160px;
		border-radius: 4px;
		margin: 6px 0;
		object-fit: cover;
	}

	.video-thumb {
		position: relative;
		display: inline-block;
	}

	.duration {
		position: absolute;
		bottom: 10px;
		right: 4px;
		background: rgba(0, 0, 0, 0.7);
		color: var(--brightest);
		font-size: 11px;
		padding: 1px 5px;
		border-radius: 3px;
	}

	.engine-badges {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
	}

	.badge {
		font-size: 10px;
		color: var(--muted-txt);
		background: var(--bg);
		padding: 1px 6px;
		border-radius: 4px;
		border: 1px solid var(--border);
	}
</style>
