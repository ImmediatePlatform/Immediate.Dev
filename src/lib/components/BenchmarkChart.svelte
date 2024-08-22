<script lang="ts">
	import { onMount } from 'svelte';
	import ApexCharts, { type ApexOptions } from 'apexcharts';

	const options: ApexOptions = {
		series: [
			{
				data: [16.6023, 27.2993, 68.3384]
			}
		],
		colors: ['#8b5cf6', '#2662d9', '#e88c30'],
		chart: {
			type: 'bar',
			height: 350,
			toolbar: {
				show: false
			},
			fontFamily: 'Inter VF',
			foreColor: '#a1a1a1',
			selection: {
				enabled: false
			}
		},
		plotOptions: {
			bar: {
				borderRadius: 10,
				borderRadiusApplication: 'around',
				horizontal: true,
				dataLabels: {
					position: 'top'
				},
				distributed: true
			}
		},
		tooltip: {
			enabled: false
		},
		grid: {
			show: false
		},
		dataLabels: {
			enabled: true,
			style: {
				colors: ['#f5f5f5'],
				fontSize: '14px'
			},
			formatter: (val: number, _) => `${val.toFixed(2)}ns`,
			offsetX: 70,
			textAnchor: 'middle'
		},
		xaxis: {
			categories: ['Immediate.Handlers', 'Mediator', 'MediatR'],
			axisBorder: {
				show: false
			},
			axisTicks: {
				show: false
			},
			labels: {
				show: false
			}
		},
		yaxis: {
			labels: {
				style: {
					fontSize: '14px'
				}
			}
		},
		legend: {
			show: false
		},
		responsive: [
			{
				breakpoint: 639,
				options: {
					dataLabels: {
						style: {
							fontSize: '12px'
						},
						offsetX: 50
					},
					yaxis: {
						labels: {
							style: {
								fontSize: '14px'
							}
						}
					}
				} as ApexOptions
			}
		]
	};

	onMount(() => {
		const chart = new ApexCharts(document.querySelector('#chart'), options);
		chart.render();
	});
</script>

<div class="chart-container">
	<div class="flex w-[100vw] items-center justify-center">
		<div class="w-5/12 md:w-8/12 sm:w-10/12">
			<div id="chart"></div>
		</div>
	</div>
</div>
