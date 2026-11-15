<script lang="ts">
	import Plate from '$lib/components/Plate.svelte';
	import { formatMoney, vehicleName } from '$lib/format';

	let { data } = $props();

	const CATEGORIES = [
		['insurance', 'Insurance'],
		['tax', 'Road tax'],
		['servicing', 'Servicing & repairs'],
		['breakdown', 'Breakdown'],
		['warranty', 'Warranty'],
		['finance', 'Finance'],
		['other', 'Other']
	] as const;

	const selected = $derived(data.summary.years.find((y) => y.year === data.year));
	/** Only show categories that have any spend, so the table stays readable. */
	const usedCategories = $derived(CATEGORIES.filter(([k]) => data.summary.years.some((y) => y.totals[k] > 0)));
	const vehicleRows = $derived(
		selected ? data.summary.vehicles.filter((v) => (selected.byVehicle[v.id]?.total ?? 0) > 0) : []
	);
	const money = (n: number | undefined) => (n ? formatMoney(n) : '—');
</script>

<svelte:head><title>Costs · Glovebox</title></svelte:head>

<h1 class="text-2xl font-semibold tracking-tight">Running costs</h1>
<p class="mt-1 max-w-3xl text-sm text-zinc-500 dark:text-zinc-400">
	Built from your service history and the costs on renewals, including past ones kept when you press <em>Renew</em>.
	Each renewal counts in the year its period started; finance counts each monthly payment. Planned costs on upcoming MOTs and services count once the work is logged in history.
</p>

{#if data.summary.years.length === 0}
	<p class="card mt-8 p-6 text-sm text-zinc-500">
		No costs recorded yet. Add premiums to insurance and tax, or log work with a cost in a vehicle’s service history, and they’ll appear here.
	</p>
{:else}
	<nav class="mt-6 flex flex-wrap gap-2" aria-label="Year">
		{#each data.summary.years as y}
			<a
				href="?year={y.year}"
				class="rounded-full border px-3 py-1 text-sm transition {y.year === data.year
					? 'border-emerald-600 bg-emerald-50 font-medium text-emerald-800 dark:border-emerald-500 dark:bg-emerald-950 dark:text-emerald-300'
					: 'border-zinc-300 text-zinc-700 hover:border-emerald-500 dark:border-zinc-700 dark:text-zinc-300'}"
				aria-current={y.year === data.year ? 'page' : undefined}>{y.year}</a
			>
		{/each}
	</nav>

	{#if selected}
		<section class="mt-6">
			<div class="flex flex-wrap items-baseline justify-between gap-2">
				<h2 class="text-lg font-semibold">{selected.year}</h2>
				<p class="text-2xl font-semibold tabular-nums">{formatMoney(selected.totals.total)}</p>
			</div>
			<div class="card mt-3 overflow-x-auto">
				<table class="w-full text-sm">
					<thead class="text-left text-xs text-zinc-500">
						<tr class="border-b border-zinc-100 dark:border-zinc-800">
							<th class="px-4 py-2 font-medium">Vehicle</th>
							{#each usedCategories as [, label]}<th class="px-4 py-2 text-right font-medium whitespace-nowrap">{label}</th>{/each}
							<th class="px-4 py-2 text-right font-medium">Total</th>
						</tr>
					</thead>
					<tbody>
						{#each vehicleRows as v (v.id)}
							{@const t = selected.byVehicle[v.id]}
							<tr class="border-b border-zinc-100 dark:border-zinc-800">
								<td class="px-4 py-2.5">
									<a href="/vehicles/{v.id}" class="flex items-center gap-2 hover:underline">
										<span class={v.archived ? 'opacity-60 grayscale' : ''}><Plate registration={v.registration} size="sm" /></span>
										<span class="truncate">{vehicleName(v)}{#if v.archived}<span class="text-zinc-400"> · archived</span>{/if}</span>
									</a>
								</td>
								{#each usedCategories as [k]}<td class="px-4 py-2.5 text-right tabular-nums">{money(t[k])}</td>{/each}
								<td class="px-4 py-2.5 text-right font-medium tabular-nums">{formatMoney(t.total)}</td>
							</tr>
						{/each}
					</tbody>
					{#if vehicleRows.length > 1}
						<tfoot>
							<tr class="font-semibold">
								<td class="px-4 py-2.5">All vehicles</td>
								{#each usedCategories as [k]}<td class="px-4 py-2.5 text-right tabular-nums">{money(selected.totals[k])}</td>{/each}
								<td class="px-4 py-2.5 text-right tabular-nums">{formatMoney(selected.totals.total)}</td>
							</tr>
						</tfoot>
					{/if}
				</table>
			</div>
		</section>
	{/if}

	{#if data.summary.years.length > 1}
		<section class="mt-10">
			<h2 class="section-title">Year by year</h2>
			<div class="card mt-3 overflow-x-auto">
				<table class="w-full text-sm">
					<thead class="text-left text-xs text-zinc-500">
						<tr class="border-b border-zinc-100 dark:border-zinc-800">
							<th class="px-4 py-2 font-medium">Year</th>
							{#each usedCategories as [, label]}<th class="px-4 py-2 text-right font-medium whitespace-nowrap">{label}</th>{/each}
							<th class="px-4 py-2 text-right font-medium">Total</th>
						</tr>
					</thead>
					<tbody>
						{#each data.summary.years as y (y.year)}
							<tr class="border-b border-zinc-100 last:border-0 dark:border-zinc-800 {y.year === data.year ? 'bg-emerald-50/60 dark:bg-emerald-950/30' : ''}">
								<td class="px-4 py-2.5"><a href="?year={y.year}" class="font-medium hover:underline">{y.year}</a></td>
								{#each usedCategories as [k]}<td class="px-4 py-2.5 text-right tabular-nums">{money(y.totals[k])}</td>{/each}
								<td class="px-4 py-2.5 text-right font-medium tabular-nums">{formatMoney(y.totals.total)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{/if}
{/if}
