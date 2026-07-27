<script lang="ts">
	let {
		name,
		nuget = true,
		release = true,
		license = true
	}: {
		name: string;
		nuget?: boolean;
		release?: boolean;
		license?: boolean;
	} = $props();

	let repositoryUrl = $derived(`https://github.com/ImmediatePlatform/${name}`);
</script>

<div class="not-prose my-4 flex flex-wrap items-center gap-1.5">
	<a href={`${repositoryUrl}/`}>
		<img
			class="m-0 block h-5 max-w-none"
			src="https://img.shields.io/badge/github-%23121011.svg?color=grey&logo=github&logoColor=white"
			alt={`${name} GitHub repository`}
		/>
	</a>
	{#if nuget}
		<a href={`https://www.nuget.org/packages/${name}/`}>
			<img
				class="m-0 block h-5 max-w-none"
				src={`https://img.shields.io/nuget/v/${name}.svg`}
				alt={`${name} NuGet version`}
			/>
		</a>
	{/if}
	{#if release}
		<a href={`${repositoryUrl}/releases/`}>
			<img
				class="m-0 block h-5 max-w-none"
				src={`https://img.shields.io/github/release/ImmediatePlatform/${name}.svg`}
				alt={`${name} latest GitHub release`}
			/>
		</a>
	{/if}
	{#if license}
		<a href={`${repositoryUrl}/blob/main/license.txt`}>
			<img
				class="m-0 block h-5 max-w-none"
				src={`https://img.shields.io/github/license/ImmediatePlatform/${name}.svg`}
				alt={`${name} license`}
			/>
		</a>
	{/if}
</div>
