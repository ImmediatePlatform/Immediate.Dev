<script lang="ts">
	export let title: string = '';
</script>

<div>
	<div class="flex-none border border-border bg-[#3f4044] rounded-t-md">
		<div class="flex items-center justify-center h-8 space-x-1.5 px-3">
			<div class="w-2.5 h-2.5 bg-red-500 rounded-full"></div>
			<div class="w-2.5 h-2.5 bg-yellow-500 rounded-full"></div>
			<div class="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
			<div class="flex w-full pr-[1.875rem] justify-center items-center">
				<span class="text-center">{title}</span>
			</div>
		</div>
	</div>
	<slot />
</div>
