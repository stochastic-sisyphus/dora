<script lang="ts">
	import { WEBUI_BASE_URL } from '$lib/stores';

	export let className = 'size-8';
	export let src = `${$WEBUI_BASE_URL}/static/favicon.png`;

	function resolveUrl(url: string): string {
		if (url === '') return `${$WEBUI_BASE_URL}/static/favicon.png`;
		if (url.startsWith($WEBUI_BASE_URL)) return url;
		if (url.startsWith('https://') || url.startsWith('http://')) return url;
		if (url.startsWith('data:')) return url;
		if (url.startsWith('/')) return `${$WEBUI_BASE_URL}${url}`;
		return `${$WEBUI_BASE_URL}/user.png`;
	}
</script>

<img
	crossorigin="anonymous"
	src={resolveUrl(src)}
	class=" {className} object-cover rounded-full -translate-y-[1px]"
	alt="profile"
	draggable="false"
/>
