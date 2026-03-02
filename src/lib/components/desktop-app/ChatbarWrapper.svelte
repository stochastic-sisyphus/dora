<script lang="ts">
	import moveChatBar from '$lib/app/actions/move-chatbar';
	import { CHATBAR_WINDOW_SIZE } from '$lib/app/constants';
	import { appConfig } from '$lib/stores';
	import { getCurrentWindow } from '@tauri-apps/api/window';
	import { onMount } from 'svelte';

	const window = getCurrentWindow();
	let element: Element;

	onMount(() => {
		const resizeObserver = new ResizeObserver(async (entries) => {
			await window.setShadow(false);
			await window.setShadow(true);
		});

		resizeObserver.observe(element);

		(async () => {
			// disable resize
			await window.setResizable(false);

			// resize window
			await window.setSize(CHATBAR_WINDOW_SIZE);

			// move to location
			moveChatBar($appConfig.chatBarPositionPreference, false);
		})();

		return () => {
			resizeObserver.disconnect();
		};
	});
</script>

<div class="w-full h-full flex flex-col items-center justify-end">
	<div
		class="w-[440px] min-h-[85px] p-3 py-5 text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-900 flex flex-col items-center justify-center rounded-3xl"
		data-tauri-drag-region
		bind:this={element}
	>
		<slot />
	</div>
</div>
