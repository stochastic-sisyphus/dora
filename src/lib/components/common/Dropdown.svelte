<script lang="ts">
	import { DropdownMenu } from 'bits-ui';
	import { createEventDispatcher } from 'svelte';

	
	export let show = false;
	export let align: 'center' | 'end' | 'start' = 'start';
	export let side: 'left' | 'right' | 'bottom' | 'top' = 'bottom';
	export let sideOffset = 8;
	const dispatch = createEventDispatcher<Record<string, any>>();
</script>

<DropdownMenu.Root
	bind:open={show}
		onOpenChange={(state) => {
		dispatch('change', state);
	}}
>
	<DropdownMenu.Trigger>
		<slot />
	</DropdownMenu.Trigger>

	<slot name="content">
		<DropdownMenu.Content
			class="w-full max-w-[130px] rounded-lg px-1 py-1.5 border border-gray-900 z-50 bg-gray-850 text-white"
			{sideOffset}
			{side}
			{align}		>
			<DropdownMenu.Item class="flex items-center px-3 py-2 text-sm  font-medium">
				<div class="flex items-center">Profile</div>
			</DropdownMenu.Item>

			<DropdownMenu.Item class="flex items-center px-3 py-2 text-sm  font-medium">
				<div class="flex items-center">Profile</div>
			</DropdownMenu.Item>

			<DropdownMenu.Item class="flex items-center px-3 py-2 text-sm  font-medium">
				<div class="flex items-center">Profile</div>
			</DropdownMenu.Item>
		</DropdownMenu.Content>
	</slot>
</DropdownMenu.Root>
