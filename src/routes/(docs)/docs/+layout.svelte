<script lang="ts">
	import Header from '$lib/components/layout/header.svelte';
	import SidebarLeft from '$lib/components/layout/sidebar-left.svelte';
	import SidebarRight from '$lib/components/layout/sidebar-right.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	let { children, data } = $props();

	const socialLinks = [
		{ platform: 'github' as const, url: 'https://github.com/ImmediatePlatform/Immediate.Dev' }
	];
</script>

<a
	href="#doc-content"
	class="bg-primary text-primary-foreground fixed top-4 left-4 z-100 -translate-y-20 rounded-md px-4 py-2 text-sm font-medium transition-transform focus:translate-y-0"
>
	Skip to content
</a>
<Sidebar.Provider>
	<SidebarLeft navigation={data.navigation} {socialLinks} />
	<Sidebar.Inset>
		<Header {socialLinks} />
		<div class="flex flex-1 flex-col gap-4 p-4">
			{@render children()}
		</div>
	</Sidebar.Inset>
	<SidebarRight />
</Sidebar.Provider>
