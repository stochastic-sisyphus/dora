<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';

	export let value = '';
	export let placeholder = 'Press Shortcut';

	const dispatch = createEventDispatcher<{
		change: string;
		clear: void;
	}>();

	let currentKeys: Set<string> = new Set();
	let isEditing = false;
	let displayValue = '';
	let clearingValue = false;

	function parseKeybind(keybind: string) {
		if (!keybind) return;
		const keys = keybind.split('+');
		currentKeys.clear();
		keys.forEach((key) => currentKeys.add(key));
		updateDisplayValue();
	}

	$: {
		if (value) {
			parseKeybind(value);
		} else {
			value = '';
			displayValue = '';
			currentKeys.clear();
		}
	}

	onMount(() => {
		if (value) {
			parseKeybind(value);
		}
	});

	const SYMBOL_MAP = {
		Cmd: '⌘',
		Ctrl: '⌃',
		Shift: '⇧',
		Option: '⌥',
		Alt: '⌥',
		Backquote: '`',
		Period: '.',
		Comma: ',',
		Slash: '/',
		Backslash: '\\',
		BracketLeft: '[',
		BracketRight: ']',
		Quote: "'",
		Semicolon: ';',
		Equal: '=',
		Minus: '-',
		Tab: '⇥',
		Backspace: '⌫',
		Delete: '⌦',
		ArrowUp: '▲',
		ArrowDown: '▼',
		ArrowLeft: '◀',
		ArrowRight: '▶',
		Enter: '⏎',
		Escape: '⎋',
		Space: '␣',
		CapsLock: '⇪'
	} as const;

	function updateDisplayValue() {
		displayValue = Array.from(currentKeys)
			.map((key) => SYMBOL_MAP[key as keyof typeof SYMBOL_MAP] || key)
			.join('');
	}

	function handleKeyDown(e: KeyboardEvent) {
		e.preventDefault();

		// Only allow if it starts with a modifier
		if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
			return;
		}

		// Don't process if the key pressed is just a modifier key
		if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
			return;
		}

		currentKeys.clear();
		isEditing = true;
		clearingValue = false;

		// Add modifiers in a consistent order:
		// Super/Cmd first, then Control, Alt, Shift
		if (e.metaKey) currentKeys.add(navigator.platform.includes('Mac') ? 'Cmd' : 'Super');
		if (e.ctrlKey) currentKeys.add('Ctrl');
		if (e.altKey) currentKeys.add(navigator.platform.includes('Mac') ? 'Option' : 'Alt');
		if (e.shiftKey) currentKeys.add('Shift');

		// Convert key to proper format
		let key = e.code;
		if (key.startsWith('Key')) {
			key = key.slice(3);
		} else if (key.startsWith('Digit')) {
			key = key.slice(5);
		}

		currentKeys.add(key);

		// Update internal value with + separator
		value = Array.from(currentKeys).join('+');
		// Update display value with symbols
		updateDisplayValue();
	}

	function handleKeyUp(e: KeyboardEvent) {
		const targetElement = e.target as HTMLElement | null;
		if (e.key === 'Escape') {
			value = '';
			displayValue = '';
			currentKeys.clear();
			dispatch('clear');
			targetElement?.blur();
		} else if (e.key === 'Enter' && value) {
			dispatch('change', value);
			targetElement?.blur();
		}
	}

	function handleBlur() {
		// Don't save if we're clearing the value
		if (!clearingValue) {
			isEditing = false;
			if (value) {
				dispatch('change', value);
			}
		}
		clearingValue = false; // Reset the flag
	}

	function handleClear() {
		clearingValue = true; // Set flag before clearing
		value = '';
		displayValue = '';
		currentKeys.clear();
		dispatch('clear');
		isEditing = false;
	}

	function handleFocus() {
		isEditing = true;
	}
</script>

<div class="relative">
	<input
		type="text"
		{placeholder}
		value={displayValue}
		readonly
		class="text-center m-[3px] w-32 h-6 px-3 py-2 border rounded bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
		on:keydown={handleKeyDown}
		on:keyup={handleKeyUp}
		on:blur={handleBlur}
		on:focus={handleFocus}
	/>

	{#if value && isEditing}
		<button
			class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
			on:click={handleClear}
			on:mousedown|preventDefault
		>
			✕
		</button>
	{/if}
</div>
