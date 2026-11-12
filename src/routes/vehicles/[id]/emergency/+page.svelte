<script lang="ts">
	import Plate from '$lib/components/Plate.svelte';
	import { formatDate, formatMoney, telHref, vehicleName } from '$lib/format';
	import { ITEM_TYPES, itemTitle } from '$lib/items';
	import { todayISO } from '$lib/status';

	let { data } = $props();
	const v = $derived(data.vehicle);

	/** Breakdown first, then insurance, then warranty. */
	const ORDER = ['breakdown', 'insurance', 'warranty'];
	const items = $derived([...data.items].sort((a, b) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type)));
	const today = todayISO();

	const accent: Record<string, string> = {
		breakdown: 'bg-amber-500 hover:bg-amber-400 text-amber-950',
		insurance: 'bg-sky-600 hover:bg-sky-500 text-white',
		warranty: 'bg-violet-600 hover:bg-violet-500 text-white'
	};
</script>

<svelte:head><title>Emergency · {v.registration} · Glovebox</title></svelte:head>

<div class="mx-auto max-w-xl">
	<a href="/vehicles/{v.id}" class="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">← {v.registration}</a>

	<a href="tel:999" class="mt-4 flex items-center justify-between rounded-2xl bg-red-600 px-5 py-4 text-white shadow-sm transition hover:bg-red-500">
		<div>
			<p class="text-lg font-bold">Someone hurt or in danger?</p>
			<p class="text-sm text-red-100">Get to safety, then call 999.</p>
		</div>
		<span class="rounded-xl bg-white/20 px-4 py-2 text-xl font-bold">999</span>
	</a>

	<section class="card mt-4 p-5">
		<p class="section-title">You’ll be asked for</p>
		<div class="mt-3 flex items-center gap-3">
			<Plate registration={v.registration} size="lg" />
		</div>
		<dl class="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
			<dt class="text-zinc-500">Vehicle</dt><dd class="font-medium">{[v.make, v.model].filter(Boolean).join(' ') || vehicleName(v)}</dd>
			{#if v.colour}<dt class="text-zinc-500">Colour</dt><dd class="font-medium">{v.colour}</dd>{/if}
			{#if v.year}<dt class="text-zinc-500">Year</dt><dd class="font-medium">{v.year}</dd>{/if}
			{#if v.fuel_type}<dt class="text-zinc-500">Fuel</dt><dd class="font-medium">{v.fuel_type}</dd>{/if}
			{#if v.vin}<dt class="text-zinc-500">VIN</dt><dd class="font-mono text-[13px] select-all">{v.vin}</dd>{/if}
			{#if v.locking_wheel_nut_code}<dt class="text-zinc-500">Locking wheel nut</dt><dd class="font-medium select-all">{v.locking_wheel_nut_code}</dd>{/if}
			{#if v.tyre_size}<dt class="text-zinc-500">Tyre size</dt><dd class="font-medium">{v.tyre_size}</dd>{/if}
		</dl>
	</section>

	{#each items as item (item.id)}
		{@const def = ITEM_TYPES[item.type]}
		{@const expired = item.due_date != null && item.due_date < today}
		<section class="card mt-4 p-5">
			<div class="flex items-baseline justify-between gap-3">
				<p class="section-title">{itemTitle(item)}</p>
				{#if expired}<span class="text-xs font-semibold text-red-600 dark:text-red-400">Expired {formatDate(item.due_date)}</span>{/if}
			</div>
			<p class="mt-1 text-lg font-semibold">{item.provider ?? itemTitle(item)}</p>
			{#if item.reference}
				<p class="mt-1 text-sm text-zinc-500">{def.fields.reference}: <span class="font-mono font-medium text-zinc-900 select-all dark:text-zinc-100">{item.reference}</span></p>
			{/if}
			{#if item.excess != null}<p class="text-sm text-zinc-500">Excess: {formatMoney(item.excess)}</p>{/if}
			<div class="mt-4 grid gap-2">
				{#if item.emergency_phone}
					<a href={telHref(item.emergency_phone)} class="flex items-center justify-between rounded-xl px-4 py-3 font-semibold shadow-sm transition {accent[item.type]}">
						<span>Call {def.fields.emergency_phone?.toLowerCase()}</span>
						<span class="tabular-nums">{item.emergency_phone}</span>
					</a>
				{/if}
				{#if item.phone}
					<a href={telHref(item.phone)} class="btn-secondary justify-between py-3">
						<span>{def.fields.phone}</span>
						<span class="tabular-nums">{item.phone}</span>
					</a>
				{/if}
			</div>
			{#if item.notes}<p class="mt-3 text-sm whitespace-pre-line text-zinc-600 dark:text-zinc-400">{item.notes}</p>{/if}
		</section>
	{:else}
		<section class="card mt-4 p-5 text-sm text-zinc-500">
			No breakdown or insurance details yet.
			{#if v.role !== 'viewer'}
				Add <a class="text-emerald-700 hover:underline dark:text-emerald-400" href="/vehicles/{v.id}/items/new?type=breakdown">breakdown cover</a>
				or <a class="text-emerald-700 hover:underline dark:text-emerald-400" href="/vehicles/{v.id}/items/new?type=insurance">insurance</a> so the numbers are here when you need them.
			{/if}
		</section>
	{/each}

	<section class="card mt-4 p-5">
		<p class="section-title">Emergency contacts</p>
		{#if data.contacts.length}
			<div class="mt-3 grid gap-2">
				{#each data.contacts as c (c.id)}
					<a href={telHref(c.phone)} class="btn-secondary justify-between py-3">
						<span>{c.name}{#if c.relationship}<span class="font-normal text-zinc-500"> · {c.relationship}</span>{/if}</span>
						<span class="tabular-nums">{c.phone}</span>
					</a>
				{/each}
			</div>
		{:else}
			<p class="mt-2 text-sm text-zinc-500">None yet. <a href="/settings" class="text-emerald-700 hover:underline dark:text-emerald-400">Add them in Settings</a>.</p>
		{/if}
	</section>

	<section class="mt-4 rounded-2xl border border-zinc-200 p-5 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
		<p class="font-semibold text-zinc-900 dark:text-zinc-100">After an accident</p>
		<ul class="mt-2 list-disc space-y-1 pl-5">
			<li>Stop, switch off the engine and put your hazards on.</li>
			<li>Swap names, addresses, registrations and insurance details with the other drivers.</li>
			<li>Take photos of the scene, damage and any injuries; note witnesses.</li>
			<li>Report to the police within 24 hours if details weren’t exchanged or anyone was injured.</li>
			<li>Tell your insurer as soon as you can, even if you don’t plan to claim.</li>
		</ul>
	</section>
</div>
