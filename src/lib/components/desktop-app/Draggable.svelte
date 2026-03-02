<script lang="ts">
	import { getCurrentWindow } from '@tauri-apps/api/window';

	const NON_DRAGGING_TAGS = [
		'INPUT',
		'TEXTAREA',
		'BUTTON',
		'SELECT',
		'A',
		'VIDEO',
		'AUDIO',
		'IMG',
		'CANVAS',
		'IFRAME',
		'SVG',
		'P',
		'SPAN',
		'H1',
		'H2',
		'H3',
		'H4',
		'H5',
		'H6',
		'PRE',
		'CODE',
		'SUMMARY',
		'DETAILS',
		'OL',
		'UL',
		'LI',
		'DD',
		'DT'
	];

	const hasOnlyRawText = (element: HTMLElement) => {
		// Check if all child nodes are text nodes and not empty
		return Array.from(element.childNodes).every(
			(node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim() !== ''
		);
	};

	const onPointerDown = async (event: PointerEvent) => {
		if (!(event?.target instanceof HTMLElement)) {
			console.debug('Pointer down on non-HTMLElement', event?.target);
			return;
		} else if (event.button !== 0) {
			console.debug('Pointer down with non-left mouse button');
			return;
		}

		if (NON_DRAGGING_TAGS.includes(event.target?.tagName?.toUpperCase())) {
			console.debug('Pointer down on non-draggable element');
			return;
		} else if (
			event.target?.tagName === 'DIV' &&
			(event.target.hasAttribute('contenteditable') || hasOnlyRawText(event.target))
		) {
			console.debug('Pointer down on editable or text-containing element');
			return;
		} else if (false) {
			// TODO else if is transparent, rgba 0 0 0 0 or has no background set whatsoever
			console.debug('Pointer down on invisible element');
			return;
		}
		await getCurrentWindow().startDragging();
	};
</script>

<svelte:window on:pointerdown={onPointerDown} />
