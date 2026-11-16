<script lang="ts">
	import { cleanAir, taxBand, type CleanAirVerdict } from '$lib/emissions';
	import { formatMoney } from '$lib/format';
	import type { Vehicle } from '$lib/types';

	let {
		vehicle,
		taxPaid = null,
		canEdit = false
	}: { vehicle: Vehicle; taxPaid?: number | null; canEdit?: boolean } = $props();

	const air = $derived(cleanAir(vehicle));
	const tax = $derived(taxBand(vehicle));

	const badge: Record<CleanAirVerdict, string> = {
		meets: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
		likely: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
		check: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
		'likely-not': 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
		not: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
		unknown: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
	};
	const link = 'text-emerald-700 hover:underline dark:text-emerald-400';
</script>

<div class="grid gap-3 md:grid-cols-2">
	<article class="card p-5">
		<h3 class="text-sm font-semibold">Clean air zones</h3>
		<p class="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">London ULEZ, and Clean Air and Low Emission Zones across the UK</p>
		<p class="mt-3"><span class="rounded-full px-2.5 py-1 text-sm font-semibold {badge[air.verdict]}">{air.headline}</span></p>
		<p class="mt-3 text-sm text-zinc-600 dark:text-zinc-400">{air.detail}</p>
		<p class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
			<a class={link} href="https://tfl.gov.uk/modes/driving/check-your-vehicle/" target="_blank" rel="noopener noreferrer">Check for London ↗</a>
			<a class={link} href="https://www.gov.uk/clean-air-zones" target="_blank" rel="noopener noreferrer">Other UK zones ↗</a>
		</p>
	</article>

	<article class="card p-5">
		<h3 class="text-sm font-semibold">Road tax</h3>
		<p class="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Vehicle Excise Duty band</p>
		{#if tax}
			<p class="mt-3 text-lg font-semibold">{tax.label}</p>
			<p class="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{tax.detail}</p>
		{:else}
			<p class="mt-3 text-sm text-zinc-600 dark:text-zinc-400">Add when it was first registered to see its tax band.</p>
		{/if}
		{#if taxPaid != null}<p class="mt-2 text-sm">You’ve recorded paying <strong>{formatMoney(taxPaid)}</strong> a year.</p>{/if}
		<p class="mt-3 text-sm">
			<a class={link} href="https://www.gov.uk/vehicle-tax-rate-tables" target="_blank" rel="noopener noreferrer">Current rates on GOV.UK ↗</a>
		</p>
	</article>
</div>
{#if canEdit && (!vehicle.first_registered || !tax || tax.label.startsWith('Taxed by') || air.verdict === 'unknown')}
	<p class="mt-2 text-xs text-zinc-500">
		Missing details make these less precise. <a class={link} href="/vehicles/{vehicle.id}/edit">Add them from your V5C</a>.
	</p>
{/if}
