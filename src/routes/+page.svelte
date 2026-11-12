<script lang="ts">
	import Plate from '$lib/components/Plate.svelte';
	import StatusDot from '$lib/components/StatusDot.svelte';
	import StatusText from '$lib/components/StatusText.svelte';
	import { formatDate, formatMiles, vehicleName } from '$lib/format';
	import { CORE_TYPES, ITEM_TYPES, itemTitle } from '$lib/items';
	import { compareStates, itemState, worst } from '$lib/status';

	let { data } = $props();

	const UPCOMING_DAYS = 90;

	const vehicles = $derived(
		data.vehicles.map((v) => {
			const items = data.items
				.filter((i) => i.vehicle_id === v.id)
				.map((i) => ({ ...i, state: itemState(i, v.mileage) }))
				.sort((a, b) => compareStates(a.state, b.state));
			const missing = CORE_TYPES.filter((t) => !items.some((i) => i.type === t));
			return { ...v, items, missing, status: worst(items.map((i) => i.state.status)) };
		})
	);

	const upcoming = $derived(
		vehicles
			.flatMap((v) => v.items.map((i) => ({ ...i, vehicle: v })))
			.filter((i) => i.state.status === 'overdue' || i.state.status === 'soon' || (i.state.days !== null && i.state.days <= UPCOMING_DAYS))
			.sort((a, b) => compareStates(a.state, b.state))
	);

	const counts = $derived({
		overdue: upcoming.filter((i) => i.state.status === 'overdue').length,
		soon: upcoming.filter((i) => i.state.status === 'soon').length
	});

	const ring = {
		overdue: 'ring-red-500/40',
		soon: 'ring-amber-400/50',
		ok: 'ring-transparent',
		none: 'ring-transparent'
	};
</script>

<svelte:head><title>Dashboard · Glovebox</title></svelte:head>

<div class="flex flex-wrap items-end justify-between gap-4">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">Your vehicles</h1>
		{#if vehicles.length}
			<p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
				{#if counts.overdue}<span class="font-medium text-red-600 dark:text-red-400">{counts.overdue} overdue</span>{#if counts.soon}{' · '}{/if}{/if}
				{#if counts.soon}<span class="font-medium text-amber-600 dark:text-amber-400">{counts.soon} due in the next 30 days</span>{/if}
				{#if !counts.overdue && !counts.soon}Everything’s up to date.{/if}
			</p>
		{/if}
	</div>
	<a href="/vehicles/new" class="btn-primary">
		<svg viewBox="0 0 20 20" class="size-4" fill="currentColor" aria-hidden="true"><path d="M10 4a1 1 0 0 1 1 1v4h4a1 1 0 1 1 0 2h-4v4a1 1 0 1 1-2 0v-4H5a1 1 0 1 1 0-2h4V5a1 1 0 0 1 1-1z" /></svg>
		Add vehicle
	</a>
</div>

{#if vehicles.length === 0}
	<div class="card mt-8 flex flex-col items-center px-6 py-16 text-center">
		<div class="flex size-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
			<svg viewBox="0 0 24 24" class="size-7" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 17h14M6.5 17l1.2-5.3A2 2 0 0 1 9.6 10h4.8a2 2 0 0 1 1.9 1.7L17.5 17M4 17v2.5M20 17v2.5" stroke-linecap="round" stroke-linejoin="round" /><circle cx="7.5" cy="17" r="1.5" /><circle cx="16.5" cy="17" r="1.5" /></svg>
		</div>
		<h2 class="mt-5 text-lg font-semibold">No vehicles yet</h2>
		<p class="mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
			Add your first vehicle, then record when its MOT, tax, insurance and service are due.
		</p>
		<a href="/vehicles/new" class="btn-primary mt-6">Add your first vehicle</a>
	</div>
{:else}
	<div class="mt-8 grid gap-4 sm:grid-cols-2">
		{#each vehicles as v (v.id)}
			<a href="/vehicles/{v.id}" class="card group block p-5 ring-2 transition hover:border-zinc-300 hover:shadow-md dark:hover:border-zinc-700 {ring[v.status]}">
				<div class="flex items-start justify-between gap-3">
					<div class="min-w-0">
						<Plate registration={v.registration} />
						<h2 class="mt-3 truncate text-lg font-semibold group-hover:text-emerald-700 dark:group-hover:text-emerald-400">{vehicleName(v)}</h2>
						<p class="truncate text-sm text-zinc-500 dark:text-zinc-400">
							{[v.nickname ? [v.make, v.model].filter(Boolean).join(' ') : null, v.year, v.colour].filter(Boolean).join(' · ') || ' '}
						</p>
					</div>
					{#if v.mileage != null}<span class="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">{formatMiles(v.mileage)}</span>{/if}
				</div>

				<ul class="mt-4 space-y-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
					{#each v.items.slice(0, 4) as item (item.id)}
						<li class="flex items-center gap-2.5">
							<StatusDot status={item.state.status} />
							<span class="flex-1 truncate text-sm">{itemTitle(item)}</span>
							<StatusText state={item.state} class="text-xs" />
						</li>
					{/each}
					{#if v.items.length > 4}
						<li class="pl-5 text-xs text-zinc-500">+{v.items.length - 4} more</li>
					{/if}
					{#if v.missing.length}
						<li class="flex items-center gap-2.5 text-sm text-zinc-400 dark:text-zinc-500">
							<StatusDot status="none" />
							No {v.missing.map((t) => ITEM_TYPES[t].label).join(', ')} recorded
						</li>
					{/if}
				</ul>
			</a>
		{/each}
	</div>

	{#if upcoming.length}
		<section class="mt-12">
			<h2 class="section-title">Coming up in the next {UPCOMING_DAYS} days</h2>
			<ul class="card mt-3 divide-y divide-zinc-100 dark:divide-zinc-800">
				{#each upcoming as item (item.id)}
					<li>
						<a href="/vehicles/{item.vehicle.id}/items/{item.id}" class="flex items-center gap-3 px-4 py-3 transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
							<StatusDot status={item.state.status} />
							<div class="w-24 shrink-0"><Plate registration={item.vehicle.registration} size="sm" /></div>
							<span class="min-w-0 flex-1 truncate text-sm font-medium">{itemTitle(item)}</span>
							<span class="hidden text-sm text-zinc-500 sm:inline dark:text-zinc-400">{formatDate(item.due_date)}</span>
							<StatusText state={item.state} class="w-36 text-right" />
						</a>
					</li>
				{/each}
			</ul>
		</section>
	{/if}
{/if}
