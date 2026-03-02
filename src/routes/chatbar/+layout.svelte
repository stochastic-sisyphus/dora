<script lang="ts">
	import moveChatBar from '$lib/app/actions/move-chatbar';
	import { setShortcut } from '$lib/app/commands/set-shortcut';
	import { appConfig, appState, theme, WEBUI_NAME } from '$lib/stores';
	import { applyTheme } from '$lib/utils';
	import { type UnlistenFn } from '@tauri-apps/api/event';
	import { getCurrentWindow } from '@tauri-apps/api/window';
	import { register, unregister, type ShortcutEvent } from '@tauri-apps/plugin-global-shortcut';
	import { onMount } from 'svelte';
	import { Toaster } from 'svelte-sonner';

	$: {
		localStorage.setItem('theme', $theme);
		console.log('App theme changed to', $theme);
		applyTheme($theme);
	}

	onMount(() => {
		let unlistenFocusChange: UnlistenFn;
		(async () => {
			// Get models and tools
			// models.set(await getModels(localStorage.token));
			// tools.set(await getTools(localStorage.token));

			// Move chat bar
			await moveChatBar($appConfig.chatBarPositionPreference, false);

			// Set global shortcut
			await setShortcut($appConfig.shortcut);

			// Add shadows
			const chatBarWindow = getCurrentWindow();
			await chatBarWindow.setShadow(true);

			// Set lose focus: hide
			unlistenFocusChange = await chatBarWindow.onFocusChanged(async ({ payload: focused }) => {
				if (!focused) {
					// Hide the window and remove Escape close window shortcut
					if (!$appState.companionChatOpen) {
						await chatBarWindow.hide();
					}
					await unregister('Escape');
				} else {
					await register('Escape', closeChatBar);
				}
			});
		})();

		return () => {
			unlistenFocusChange();
		};
	});

	const closeChatBar = async (event: ShortcutEvent) => {
		if (event.state !== 'Pressed') {
			return;
		}

		await getCurrentWindow().hide();
	};
</script>

<svelte:head>
	<title>{$WEBUI_NAME}</title>
</svelte:head>
<slot />
<Toaster
	theme={$theme.includes('dark')
		? 'dark'
		: $theme === 'system'
			? window.matchMedia('(prefers-color-scheme: dark)').matches
				? 'dark'
				: 'light'
			: 'light'}
	richColors
	position="top-center"
/>

<style lang="postcss">
	:global(body) {
		@apply w-screen h-screen overflow-hidden;
	}
</style>
