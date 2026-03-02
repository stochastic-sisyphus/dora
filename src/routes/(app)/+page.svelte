<script lang="ts">
	import { goto } from '$app/navigation';
	import { CHATBAR_WINDOW_LABEL } from '$lib/app/constants';
	import Chat from '$lib/components/chat/Chat.svelte';
	import Help from '$lib/components/layout/Help.svelte';
	import { getCurrentWindow } from '@tauri-apps/api/window';
	import { onMount } from 'svelte';

	onMount(async () => {
		// Redirect chatbar to /chatbar
		if (getCurrentWindow().label === CHATBAR_WINDOW_LABEL && window.location.pathname === '/') {
			await goto('/chatbar');
		}
	});
</script>

<Help />
<Chat />
