<script>
	import { goto } from '$app/navigation';
	import { WEBUI_BASE_URL, WEBUI_NAME, config } from '$lib/stores';
	import { onMount, getContext } from 'svelte';

	const i18n = getContext('i18n');

	let loaded = false;

	onMount(async () => {
		if ($config) {
			await goto('/');
		}

		loaded = true;
	});
</script>

{#if loaded}
	<div class="absolute w-full h-full flex z-50">
		<div class="absolute rounded-xl w-full h-full backdrop-blur flex justify-center">
			<div class="m-auto pb-44 flex flex-col justify-center">
				<div class="max-w-md">
					<div class="text-center text-2xl font-medium z-50">
						{$WEBUI_NAME} server unavailable
					</div>

					<div class=" mt-4 text-center text-sm w-full">
						Dora could not read backend configuration from the current server URL.
						<br class=" " />
						<br class=" " />
						This usually means the server is offline, the URL is wrong, or this URL does not provide the
						configuration endpoint Dora checked during startup.

						{#if $WEBUI_BASE_URL}
							<br class=" " />
							<br class=" " />
							<span class="font-medium">Current URL:</span>
							<span class="break-all">{$WEBUI_BASE_URL}</span>
						{/if}
					</div>

					<div class="mt-6 mx-auto flex flex-wrap justify-center gap-3 relative group w-fit">
						<button
							class="relative z-20 flex px-5 py-2 rounded-full bg-white/90 hover:bg-white transition font-medium text-sm border border-gray-200"
							on:click={() => {
								goto('/setup');
							}}
						>
							Change Server URL
						</button>

						<button
							class="relative z-20 flex px-5 py-2 rounded-full bg-gray-100 hover:bg-gray-200 transition font-medium text-sm"
							on:click={() => {
								location.href = '/';
							}}
						>
							Check Again
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}
