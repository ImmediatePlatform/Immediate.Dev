<script lang="ts">
	import { Chart, Svg, Axis, Bar, Bars, Labels, LinearGradient } from 'layerchart';
	import { scaleBand } from 'd3-scale';
	import type { ClassValue } from 'clsx';
	import { cn } from '$lib/utils';

	let className: ClassValue | undefined = undefined;
	export { className as class };

	let innerWidth: number;

	const data = [
		{
			lib: 'Immediate.Handlers',
			value: 16.6023
		},
		{
			lib: 'Mediator',
			value: 27.2993
		},
		{
			lib: 'MediatR',
			value: 68.3384
		}
	];

	const labelFormatter = (x: number): string => `${x.toFixed(2)}ns`;

	let labelPlacement: 'outside' | 'inside' | undefined;
	$: labelPlacement = innerWidth < 1000 ? 'outside' : 'inside';
</script>

<svelte:window bind:innerWidth />

<div class={cn(className)}>
	<Chart
		{data}
		x="value"
		xDomain={[0, null]}
		y="lib"
		yScale={scaleBand().padding(0.4)}
		padding={{ left: 20, bottom: 20 }}
	>
		<Svg>
			<Axis
				placement="left"
				rule={{ class: 'stroke-none' }}
				tickLabelProps={{
					textAnchor: 'end',
					class: 'sm:text-xs text-sm fill-soft'
				}}
			/>
			<LinearGradient class="from-violet-500 to-fuchsia-500" units="userSpaceOnUse" let:url>
				<Bars class="border-0">
					{#each data as bar, i}
						<Bar {bar} radius={4} strokeWidth={1} fill={i === 0 ? url : undefined} />
					{/each}
				</Bars>
			</LinearGradient>
			<Labels
				format={labelFormatter}
				placement={labelPlacement}
				class="fill-inverse text-sm sm:text-xs"
			/>
		</Svg>
	</Chart>
</div>
