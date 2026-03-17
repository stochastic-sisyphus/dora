<script lang="ts">
	import { goto } from '$app/navigation';
	import { probeCompatibleServer } from '$lib/apis';
	import { APP_STORE_FILE } from '$lib/app/constants';
	import { APP_NAME } from '$lib/constants';
	import { appConfig, config, models, WEBUI_BASE_URL, WEBUI_NAME } from '$lib/stores';
	import { getStore } from '@tauri-apps/plugin-store';
	import type { i18n as i18nType } from 'i18next';
	import { getContext, onMount } from 'svelte';
	import type { Writable } from 'svelte/store';

	const i18n: Writable<i18nType> = getContext('i18n');

	console.debug('On setup page');

	let baseUrl = '';
	let probing = false;
	let probeError = '';
	let probeResult:
		| null
		| {
				name: string;
				modelCount: number;
				compatibilityMode: boolean;
				authRequired: boolean;
		  } = null;

	const normalizeBaseUrl = (url: string) => url.trim().replace(/\/+$/, '');

	const persistBaseUrl = async () => {
		const normalizedBaseUrl = baseUrl.trim().replace(/\/+$/, '');
		if (!normalizedBaseUrl) {
			probeError = 'Please enter a server URL.';
			return;
		}

		probing = true;
		probeError = '';

		let serverProfile;
		try {
			serverProfile = await probeCompatibleServer(normalizedBaseUrl);
		} catch (error) {
			probeResult = null;
			probeError = error instanceof Error ? error.message : String(error);
			probing = false;
			return;
		}

		baseUrl = normalizedBaseUrl;
		probeResult = {
			name: serverProfile.name,
			modelCount: serverProfile.modelCount,
			compatibilityMode: serverProfile.compatibilityMode,
			authRequired: Boolean(serverProfile.authRequired)
		};
		$WEBUI_NAME = serverProfile.name;
		$config = serverProfile.config ?? $config;
		$models = serverProfile.models;
		$WEBUI_BASE_URL = normalizedBaseUrl;
		$appConfig = { ...$appConfig, webuiBaseUrl: normalizedBaseUrl };

		if (serverProfile.authRequired) {
			probing = false;
			window.location.href = '/auth';
			return;
		}

		probing = false;
	};

	const onKeyDown = async (e: KeyboardEvent) => {
		if (e.key === 'Enter') {
			await persistBaseUrl();
		}
	};

	$: if (normalizeBaseUrl(baseUrl) !== $WEBUI_BASE_URL) {
		probeError = '';
		probeResult = null;
	}

	$: if ($WEBUI_BASE_URL) {
		goto('/', { replaceState: true });
	}

	let splashScreen: HTMLElement | null;
	// Function to reveal the splash screen later
	const revealSplashScreen = () => {
		if (splashScreen) {
			splashScreen.style.display = ''; // Reset display to original
			splashScreen.dataset.visible = 'true'; // Update visibility state
		}
	};

	$: $i18n.t('Sign in');

	onMount(async () => {
		console.debug('SETUP PAGE MOUNTED');
		const store = await getStore(APP_STORE_FILE);
		for (const key of (await store?.keys()) || []) {
			if (key !== 'app_config' && key !== 'compatible_server_url') {
				await store?.delete(key);
			}
		}
		await store?.save();
		console.log(await store?.entries());
		// Hide splash screen, since we haven't loaded yet we'll need to put it back later
		splashScreen = document.getElementById('splash-screen');
		if (splashScreen) {
			splashScreen.style.display = 'none'; // Hide the element
			splashScreen.dataset.visible = 'false'; // Store visibility state
		}
	});
</script>

<div class="w-full h-screen max-h-[100dvh] relative bg-white dark:bg-gray-900">
	<!-- <div class="w-full h-full absolute top-0 left-0 bg-white dark:bg-black z-[-1]"></div> -->

	<div class="w-full h-full flex items-center justify-center">
		<div class="w-full sm:max-w-md px-10 min-h-screen flex flex-col text-center">
			<div class="my-auto pb-10 w-full dark:text-gray-100">
				<h1 class="text-3xl font-bold mb-8 text-gray-900 dark:text-white">
					Welcome to {APP_NAME}
				</h1>

				<form
					class="flex flex-col justify-center space-y-4"
					on:submit|preventDefault={async () => {
						await persistBaseUrl();
					}}
				>
					<div class="text-center text-gray-600 dark:text-gray-400 mb-4">
						Enter the base URL of your Open WebUI server or another compatible server to get started
						<div class="mt-1 text-xs text-gray-500 dark:text-gray-500">
							Use the server root URL, for example <code>http://localhost:3000</code>, not a docs page or a specific model endpoint.
						</div>
					</div>

					<div class="space-y-1">
						<div class=" text-sm font-medium text-left mb-1">
							Server Base URL
						</div>
						<input
							bind:value={baseUrl}
							autocorrect="off"
							autocomplete="url"
							spellcheck="false"
							on:keydown={onKeyDown}
							placeholder="http://localhost:3000"
							class="my-0.5 w-full text-sm outline-none bg-transparent"
						/>
					</div>

					{#if probeError}
						<div class="text-left text-sm text-red-600 dark:text-red-400">
							{probeError}
						</div>
					{/if}

					{#if probeResult}
						<div class="rounded-2xl border border-gray-200 dark:border-gray-800 px-4 py-3 text-left">
							<div class="text-sm font-medium text-gray-900 dark:text-white">
								{probeResult.name}
							</div>
							<div class="mt-1 text-xs text-gray-600 dark:text-gray-400">
								{probeResult.authRequired
									? 'Open WebUI auth detected'
									: probeResult.compatibilityMode
										? 'Compatible API detected'
										: 'Backend API detected'}
							</div>
							{#if probeResult.authRequired}
								<div class="mt-1 text-xs text-gray-600 dark:text-gray-400">
									Sign in first. Dora will discover models after authentication.
								</div>
							{:else}
								<div class="mt-1 text-xs text-gray-600 dark:text-gray-400">
									{probeResult.modelCount} model{probeResult.modelCount === 1 ? '' : 's'} discovered
								</div>
							{/if}
						</div>
					{/if}

					<button
						class="bg-gray-700/5 hover:bg-gray-700/10 dark:bg-gray-100/5 dark:hover:bg-gray-100/10 dark:text-gray-300 dark:hover:text-white transition w-full rounded-full font-medium text-sm py-2.5"
						type="submit"
						disabled={probing}
					>
						{probing ? 'Checking Server…' : 'Get Started'}
					</button>
				</form>
			</div>
		</div>
	</div>
</div>
