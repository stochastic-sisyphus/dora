<script lang="ts">
	import { WEBUI_BASE_URL } from '$lib/stores';
	import { getCurrentWindow } from '@tauri-apps/api/window';
	import { debug, error, info, warn } from '@tauri-apps/plugin-log';
	import Layout from './Layout.svelte';

	// For debug purposes!
	const routeLoggingToTauriConsole = async () => {
		// @ts-expect-error patched doesn't exist on console but this is for debugging anyway
		if (console.patched === true) {
			console.debug('Tauri console already patched');
			return;
		}

		// @ts-expect-error patched doesn't exist on console but this is for debugging anyway
		console.patched = true;
		const _debug = console.debug;
		const _log = console.log;
		const _warn = console.warn;
		const _error = console.error;
		console.debug = (...data) => {
			_debug(...data);
			const str = `[${getCurrentWindow().label}] ${data.map((d) => JSON.stringify(d)).join(', ')}`;
			debug(str);
		};

		console.log = (...data) => {
			_log(...data);
			const str = `[${getCurrentWindow().label}] ${data.map((d) => JSON.stringify(d)).join(', ')}`;
			info(str);
		};

		console.warn = (...data) => {
			_warn(...data);
			const str = `[${getCurrentWindow().label}] ${data.map((d) => JSON.stringify(d)).join(', ')}`;
			warn(str);
		};

		console.error = (...data) => {
			_error(...data);
			const str = `[${getCurrentWindow().label}] ${data.map((d) => JSON.stringify(d)).join(', ')}`;
			error(str);
		};
	};

	// makes all console logs go to tauri dev console
	// routeLoggingToTauriConsole();
</script>

{#key $WEBUI_BASE_URL}
	<Layout>
		<slot />
	</Layout>
{/key}
