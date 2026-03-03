<script lang="ts">
	import { theme, WEBUI_NAME } from '$lib/stores';
	import { applyTheme } from '$lib/utils';
	import { onMount } from 'svelte';

	$: {
		localStorage.setItem('theme', $theme);
		applyTheme($theme);
	}

	onMount(() => {
		theme.set(localStorage.theme);
	});
</script>

<svelte:head>
	<title>{$WEBUI_NAME} — Navigator</title>
</svelte:head>

<div class="h-screen w-full overflow-hidden" style="background: #16130f;">
	<slot />
</div>

<style lang="postcss">
	:global(body) {
		@apply w-screen h-screen overflow-hidden m-0 p-0;
		background: #16130f;
	}
</style>
