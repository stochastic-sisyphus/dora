<script lang="ts">
	import DOMPurify from 'dompurify';

	import { onDestroy } from 'svelte';

	import tippy from 'tippy.js';

	export let placement: any = 'top';
	export let content = `I'm a tooltip!`;
	export let touch = true;
	export let className = 'flex';
	export let theme = '';
	export let allowHTML = true;
	export let tippyOptions: Record<string, any> = {};

	let tooltipElement: HTMLElement | null = null;
	let tooltipInstance: any = null;

	$: if (tooltipElement && content) {
		if (tooltipInstance) {
			tooltipInstance.setContent(DOMPurify.sanitize(content));
		} else {
			tooltipInstance = (tippy as any)(tooltipElement, {
				content: DOMPurify.sanitize(content),
				placement,
				allowHTML,
				touch,
				...(theme !== '' ? { theme } : { theme: 'dark' }),
				arrow: false,
				offset: [0, 4],
				...tippyOptions
			});
		}
	} else if (tooltipInstance && content === '') {
		if (tooltipInstance) {
			tooltipInstance.destroy();
		}
	}

	onDestroy(() => {
		if (tooltipInstance) {
			tooltipInstance.destroy();
		}
	});
</script>

<div bind:this={tooltipElement} aria-label={DOMPurify.sanitize(content)} class={className}>
	<slot />
</div>
