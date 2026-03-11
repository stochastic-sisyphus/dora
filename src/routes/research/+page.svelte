<script lang="ts">
	import { onMount } from 'svelte';
	import {
		searchSearXNG,
		runFabric,
		listFabricPatterns,
		inquiryList,
		inquiryAsk,
		inquiryShow,
		inquiryDig,
		type InquiryRow,
		type InquiryResult
	} from '$lib/app/sidecar';
	import { appConfig } from '$lib/stores';

	// Search state
	let searchQuery = '';
	let searchResults: any[] = [];
	let searchLoading = false;
	let searchError = '';

	// Fabric state
	let fabricPatterns: string[] = [];
	let selectedPattern = '';
	let fabricInput = '';
	let fabricOutput = '';
	let fabricRunning = false;

	// Inquiry state
	let inquiries: InquiryRow[] = [];
	let activeInquiry: InquiryResult | null = null;
	let newInquiryText = '';
	let inquiryLoading = false;

	// Active panel
	let activePanel: 'search' | 'fabric' | 'inquiry' = 'search';

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

	async function handleFabric(): Promise<void> {
		if (!selectedPattern || !fabricInput.trim()) return;
		fabricRunning = true;
		fabricOutput = '';

		try {
			await runFabric(selectedPattern, fabricInput, (chunk: string) => {
				fabricOutput += chunk;
			});
		} catch (err) {
			fabricOutput += '\n[Error: ' + (err instanceof Error ? err.message : String(err)) + ']';
		} finally {
			fabricRunning = false;
		}
	}

	async function handleNewInquiry(): Promise<void> {
		if (!newInquiryText.trim()) return;
		inquiryLoading = true;

		try {
			const result = await inquiryAsk(newInquiryText);
			activeInquiry = result;
			newInquiryText = '';
			await refreshInquiries();
		} catch (err) {
			console.error('Inquiry failed:', err);
		} finally {
			inquiryLoading = false;
		}
	}

	async function selectInquiry(id: number): Promise<void> {
		inquiryLoading = true;
		try {
			activeInquiry = await inquiryShow(id);
		} catch (err) {
			console.error('Failed to load inquiry:', err);
		} finally {
			inquiryLoading = false;
		}
	}

	async function digDeeper(id: number): Promise<void> {
		inquiryLoading = true;
		try {
			activeInquiry = await inquiryDig(id);
			await refreshInquiries();
		} catch (err) {
			console.error('Dig failed:', err);
		} finally {
			inquiryLoading = false;
		}
	}

	async function refreshInquiries(): Promise<void> {
		try {
			inquiries = await inquiryList();
		} catch {
			inquiries = [];
		}
	}

	function useFabricOnResult(text: string): void {
		fabricInput = text;
		activePanel = 'fabric';
	}

	function statusColor(status: string): string {
		switch (status) {
			case 'saturated':
				return 'var(--accent2)';
			case 'active':
				return 'var(--accent1)';
			default:
				return 'var(--muted-txt)';
		}
	}

	onMount(async () => {
		try {
			fabricPatterns = await listFabricPatterns();
			if (fabricPatterns.length > 0) {
				selectedPattern = fabricPatterns[0];
			}
		} catch {
			fabricPatterns = [];
		}

		await refreshInquiries();
	});
</script>

<div class="research-root">
	<!-- Title bar drag region -->
	<div class="titlebar" data-tauri-drag-region></div>

	<div class="research-layout">
		<!-- Inquiry sidebar -->
		<aside class="inquiry-sidebar">
			<h2 class="sidebar-title">Inquiries</h2>

			<div class="new-inquiry">
				<input
					type="text"
					bind:value={newInquiryText}
					placeholder="Ask a question..."
					on:keydown={(e) => { if (e.key === 'Enter') handleNewInquiry(); }}
				/>
				<button
					class="btn btn-primary"
					on:click={handleNewInquiry}
					disabled={inquiryLoading || !newInquiryText.trim()}
				>
					New Inquiry
				</button>
			</div>

			<div class="inquiry-list">
				{#each inquiries as inquiry}
					<button
						class="inquiry-item"
						class:active={activeInquiry?.inquiry?.id === inquiry.id}
						on:click={() => selectInquiry(inquiry.id)}
					>
						<span class="inquiry-status" style="background: {statusColor(inquiry.status)}"></span>
						<span class="inquiry-question">{inquiry.question}</span>
						<span class="inquiry-count">{inquiry.finding_count}</span>
					</button>
				{/each}

				{#if inquiries.length === 0}
					<p class="empty-state">No inquiries yet. Ask a question to start.</p>
				{/if}
			</div>
		</aside>

		<!-- Main content -->
		<main class="research-main">
			<!-- Tab bar -->
			<div class="tab-bar">
				<button
					class="tab"
					class:active={activePanel === 'search'}
					on:click={() => { activePanel = 'search'; }}
				>
					Search
				</button>
				<button
					class="tab"
					class:active={activePanel === 'fabric'}
					on:click={() => { activePanel = 'fabric'; }}
				>
					Fabric
				</button>
				<button
					class="tab"
					class:active={activePanel === 'inquiry'}
					on:click={() => { activePanel = 'inquiry'; }}
				>
					Inquiry Detail
				</button>
			</div>

			<!-- Search panel -->
			{#if activePanel === 'search'}
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
								<button
									class="btn btn-small"
									on:click={() => useFabricOnResult(result.content || result.title)}
								>
									Run Fabric
								</button>
							</div>
						{/each}

						{#if searchResults.length === 0 && !searchLoading && !searchError}
							<p class="empty-state">Enter a query and click Search.</p>
						{/if}
					</div>
				</div>
			{/if}

			<!-- Fabric panel -->
			{#if activePanel === 'fabric'}
				<div class="panel">
					<div class="fabric-controls">
						<select bind:value={selectedPattern}>
							{#each fabricPatterns as pattern}
								<option value={pattern}>{pattern}</option>
							{/each}
							{#if fabricPatterns.length === 0}
								<option value="" disabled>No patterns available</option>
							{/if}
						</select>
						<button
							class="btn btn-primary"
							on:click={handleFabric}
							disabled={fabricRunning || !selectedPattern || !fabricInput.trim()}
						>
							{fabricRunning ? 'Running...' : 'Run Fabric'}
						</button>
					</div>

					<textarea
						bind:value={fabricInput}
						placeholder="Paste or type input text..."
						class="fabric-input"
						rows="6"
					></textarea>

					{#if fabricOutput}
						<div class="fabric-output">
							<h3>Output</h3>
							<pre>{fabricOutput}</pre>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Inquiry detail panel -->
			{#if activePanel === 'inquiry'}
				<div class="panel">
					{#if activeInquiry}
						<div class="inquiry-detail">
							<div class="inquiry-header">
								<h2>{activeInquiry.inquiry.question}</h2>
								<div class="inquiry-meta">
									<span class="status-badge" style="background: {statusColor(activeInquiry.inquiry.status)}">
										{activeInquiry.inquiry.status}
									</span>
									<span class="finding-count">
										{activeInquiry.inquiry.finding_count} findings
									</span>
								</div>
								<button
									class="btn btn-primary"
									on:click={() => digDeeper(activeInquiry.inquiry.id)}
									disabled={inquiryLoading}
								>
									{inquiryLoading ? 'Digging...' : 'Dig Deeper'}
								</button>
							</div>

							{#if activeInquiry.findings.length > 0}
								<h3>Findings</h3>
								<div class="findings-list">
									{#each activeInquiry.findings as finding}
										<div class="finding-card">
											<pre>{JSON.stringify(finding, null, 2)}</pre>
										</div>
									{/each}
								</div>
							{/if}

							{#if activeInquiry.gaps.length > 0}
								<h3>Knowledge Gaps</h3>
								<div class="gaps-list">
									{#each activeInquiry.gaps as gap}
										<div class="gap-card">
											<pre>{JSON.stringify(gap, null, 2)}</pre>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					{:else}
						<p class="empty-state">Select an inquiry from the sidebar to view details.</p>
					{/if}
				</div>
			{/if}
		</main>
	</div>
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
		--light-bg: #F2EBE3;
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

	.research-layout {
		display: flex;
		flex: 1;
		overflow: hidden;
	}

	/* Inquiry sidebar */
	.inquiry-sidebar {
		width: 260px;
		min-width: 260px;
		background: var(--panel);
		border-right: 1px solid var(--border);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.sidebar-title {
		font-family: 'EB Garamond', 'Georgia', serif;
		font-size: 1.1rem;
		color: var(--bright);
		padding: 12px 16px 8px;
		margin: 0;
	}

	.new-inquiry {
		padding: 8px 12px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.new-inquiry input {
		width: 100%;
	}

	.inquiry-list {
		flex: 1;
		overflow-y: auto;
		padding: 4px 8px;
	}

	.inquiry-item {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		padding: 8px 10px;
		border: none;
		border-radius: 6px;
		background: transparent;
		color: var(--text);
		cursor: pointer;
		text-align: left;
		font-size: 0.85rem;
		transition: background 0.15s;
	}

	.inquiry-item:hover {
		background: var(--border);
	}

	.inquiry-item.active {
		background: var(--border);
		color: var(--bright);
	}

	.inquiry-status {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.inquiry-question {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.inquiry-count {
		font-size: 0.75rem;
		color: var(--muted-txt);
		background: var(--bg);
		padding: 1px 6px;
		border-radius: 10px;
	}

	/* Main content */
	.research-main {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.tab-bar {
		display: flex;
		gap: 2px;
		padding: 8px 16px 0;
		border-bottom: 1px solid var(--border);
	}

	.tab {
		padding: 8px 20px;
		border: none;
		border-bottom: 2px solid transparent;
		background: transparent;
		color: var(--muted-txt);
		cursor: pointer;
		font-size: 0.9rem;
		font-family: 'Source Sans 3', 'Source Sans Pro', system-ui, sans-serif;
		transition: color 0.15s, border-color 0.15s;
	}

	.tab:hover {
		color: var(--text);
	}

	.tab.active {
		color: var(--bright);
		border-bottom-color: var(--accent1);
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

	input, textarea, select {
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

	input:focus, textarea:focus, select:focus {
		border-color: var(--accent1);
	}

	input::placeholder, textarea::placeholder {
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

	.btn-small {
		padding: 4px 10px;
		font-size: 0.78rem;
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
		margin: 0 0 8px;
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

	/* Fabric */
	.fabric-controls {
		display: flex;
		gap: 8px;
		margin-bottom: 12px;
	}

	.fabric-controls select {
		flex: 1;
	}

	.fabric-input {
		width: 100%;
		resize: vertical;
		margin-bottom: 12px;
	}

	.fabric-output {
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 12px 16px;
	}

	.fabric-output h3 {
		font-family: 'EB Garamond', 'Georgia', serif;
		color: var(--bright);
		margin: 0 0 8px;
		font-size: 1rem;
	}

	.fabric-output pre {
		font-family: 'Fira Code', monospace;
		font-size: 0.82rem;
		color: var(--text);
		white-space: pre-wrap;
		word-break: break-word;
		margin: 0;
		line-height: 1.6;
	}

	/* Inquiry detail */
	.inquiry-detail h2 {
		font-family: 'EB Garamond', 'Georgia', serif;
		color: var(--bright);
		font-size: 1.3rem;
		margin: 0 0 8px;
	}

	.inquiry-detail h3 {
		font-family: 'EB Garamond', 'Georgia', serif;
		color: var(--bright);
		font-size: 1rem;
		margin: 16px 0 8px;
	}

	.inquiry-header {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px;
		margin-bottom: 16px;
	}

	.inquiry-header h2 {
		flex: 1;
		min-width: 200px;
	}

	.inquiry-meta {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.status-badge {
		padding: 2px 10px;
		border-radius: 10px;
		font-size: 0.75rem;
		color: var(--bg);
		font-weight: 600;
		text-transform: capitalize;
	}

	.finding-count {
		font-size: 0.8rem;
		color: var(--muted-txt);
	}

	.findings-list, .gaps-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.finding-card, .gap-card {
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 12px 16px;
	}

	.finding-card pre, .gap-card pre {
		font-family: 'Fira Code', monospace;
		font-size: 0.8rem;
		color: var(--text);
		white-space: pre-wrap;
		word-break: break-word;
		margin: 0;
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
