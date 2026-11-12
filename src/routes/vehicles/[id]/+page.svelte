<script lang="ts">
	import { enhance } from '$app/forms';
	import Plate from '$lib/components/Plate.svelte';
	import StatusDot from '$lib/components/StatusDot.svelte';
	import StatusText from '$lib/components/StatusText.svelte';
	import { formatDate, formatMiles, formatMoney, telHref, vehicleName, websiteHref } from '$lib/format';
	import { CORE_TYPES, ITEM_TYPES, ITEM_TYPE_ORDER, itemTitle } from '$lib/items';
	import { compareStates, itemState } from '$lib/status';

	let { data, form } = $props();

	const v = $derived(data.vehicle);
	const canEdit = $derived(v.role !== 'viewer');
	const isOwner = $derived(v.role === 'owner');

	const items = $derived(
		data.items
			.map((i) => ({ ...i, state: itemState(i, v.mileage) }))
			.sort((a, b) => compareStates(a.state, b.state))
	);
	const missing = $derived(CORE_TYPES.filter((t) => !items.some((i) => i.type === t)));

	const details = $derived(
		[
			['Make', v.make],
			['Model', v.model],
			['Year', v.year],
			['Colour', v.colour],
			['Fuel', v.fuel_type],
			['Engine', v.engine_cc ? `${v.engine_cc.toLocaleString('en-GB')} cc` : null],
			['VIN', v.vin],
			['Tyre size', v.tyre_size],
			['Tyre pressures', v.tyre_pressure_front || v.tyre_pressure_rear ? `Front ${v.tyre_pressure_front ?? '—'} · Rear ${v.tyre_pressure_rear ?? '—'}` : null],
			['Oil', v.oil_spec],
			['Locking wheel nut', v.locking_wheel_nut_code],
			['Key code', v.key_code],
			['Bought', v.purchase_date ? `${formatDate(v.purchase_date)}${v.purchase_price != null ? ` for ${formatMoney(v.purchase_price)}` : ''}` : null]
		].filter(([, value]) => value != null && value !== '') as [string, string | number][]
	);

	const border = {
		overdue: 'border-l-red-500',
		soon: 'border-l-amber-400',
		ok: 'border-l-emerald-500',
		none: 'border-l-zinc-300 dark:border-l-zinc-700'
	};

	let editingMileage = $state(false);
	const roleLabels = { owner: 'Owner', editor: 'Can edit', viewer: 'Can view' };
</script>

<svelte:head><title>{v.registration} · Glovebox</title></svelte:head>

<a href="/" class="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">← Dashboard</a>

<header class="mt-3 flex flex-wrap items-start justify-between gap-4">
	<div class="min-w-0">
		<Plate registration={v.registration} size="lg" />
		<h1 class="mt-3 text-2xl font-semibold tracking-tight">{vehicleName(v)}</h1>
		<div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-500 dark:text-zinc-400">
			{#if v.nickname && (v.make || v.model)}<span>{[v.make, v.model].filter(Boolean).join(' ')}</span>{/if}
			{#if editingMileage}
				<form
					method="POST"
					action="?/mileage"
					class="flex items-center gap-2"
					use:enhance={() => async ({ update, result }) => {
						await update({ reset: false });
						if (result.type === 'success') editingMileage = false;
					}}
				>
					<!-- svelte-ignore a11y_autofocus -->
					<input class="input w-32 py-1" name="mileage" inputmode="numeric" value={v.mileage ?? ''} autofocus aria-label="Current mileage" />
					<button class="btn-primary px-3 py-1">Save</button>
					<button type="button" class="btn-ghost px-2 py-1" onclick={() => (editingMileage = false)}>Cancel</button>
				</form>
			{:else}
				<span>{v.mileage != null ? formatMiles(v.mileage) : 'Mileage not set'}</span>
				{#if canEdit}<button class="text-emerald-700 hover:underline dark:text-emerald-400" onclick={() => (editingMileage = true)}>Update mileage</button>{/if}
			{/if}
		</div>
		{#if form?.mileageError}<p class="mt-2 text-sm text-red-600">{form.mileageError}</p>{/if}
	</div>
	<div class="flex gap-2">
		<a href="/vehicles/{v.id}/emergency" class="btn border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/60 dark:text-red-300 dark:hover:bg-red-950">
			<svg viewBox="0 0 20 20" class="size-4" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M8.5 3.3a1.7 1.7 0 0 1 3 0l6.3 11.2A1.7 1.7 0 0 1 16.3 17H3.7a1.7 1.7 0 0 1-1.5-2.5zM10 7a.9.9 0 0 0-.9.9v3.2a.9.9 0 1 0 1.8 0V7.9A.9.9 0 0 0 10 7m0 7.6a1 1 0 1 0 0-2 1 1 0 0 0 0 2" clip-rule="evenodd" /></svg>
			Emergency card
		</a>
		{#if canEdit}<a href="/vehicles/{v.id}/edit" class="btn-secondary">Edit</a>{/if}
	</div>
</header>

<!-- Renewals & due dates -->
<section class="mt-10">
	<div class="flex items-center justify-between">
		<h2 class="section-title">Renewals &amp; due dates</h2>
	</div>

	<div class="mt-3 grid gap-3 md:grid-cols-2">
		{#each items as item (item.id)}
			<article class="card border-l-4 p-5 {border[item.state.status]}">
				<div class="flex items-start justify-between gap-3">
					<div>
						<div class="flex items-center gap-2">
							<StatusDot status={item.state.status} />
							<h3 class="font-semibold">{itemTitle(item)}</h3>
						</div>
						<p class="mt-1 text-sm">
							{#if item.due_date}<span class="text-zinc-500 dark:text-zinc-400">{ITEM_TYPES[item.type]?.dueLabel ?? 'Due'} {formatDate(item.due_date)}</span>{/if}
							{#if item.due_mileage != null}<span class="text-zinc-500 dark:text-zinc-400">{item.due_date ? ' or at ' : 'At '}{formatMiles(item.due_mileage)}</span>{/if}
						</p>
						<StatusText state={item.state} />
					</div>
					{#if canEdit}<a href="/vehicles/{v.id}/items/{item.id}" class="btn-ghost -mt-1 -mr-2 px-3 py-1.5">Edit</a>{/if}
				</div>

				{#if item.provider || item.reference || item.phone || item.emergency_phone || item.cost != null || item.website}
					<dl class="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 border-t border-zinc-100 pt-4 text-sm dark:border-zinc-800">
						{#if item.provider}<dt class="text-zinc-500">{ITEM_TYPES[item.type]?.fields.provider ?? 'Provider'}</dt><dd>{item.provider}</dd>{/if}
						{#if item.reference}<dt class="text-zinc-500">{ITEM_TYPES[item.type]?.fields.reference ?? 'Reference'}</dt><dd class="font-mono text-[13px] select-all">{item.reference}</dd>{/if}
						{#if item.emergency_phone}<dt class="text-zinc-500">{ITEM_TYPES[item.type]?.fields.emergency_phone ?? 'Emergency'}</dt><dd><a class="font-medium text-red-700 hover:underline dark:text-red-400" href={telHref(item.emergency_phone)}>{item.emergency_phone}</a></dd>{/if}
						{#if item.phone}<dt class="text-zinc-500">{ITEM_TYPES[item.type]?.fields.phone ?? 'Phone'}</dt><dd><a class="text-emerald-700 hover:underline dark:text-emerald-400" href={telHref(item.phone)}>{item.phone}</a></dd>{/if}
						{#if item.website}<dt class="text-zinc-500">Website</dt><dd class="truncate"><a class="text-emerald-700 hover:underline dark:text-emerald-400" href={websiteHref(item.website)} target="_blank" rel="noopener noreferrer">{item.website.replace(/^https?:\/\//, '')}</a></dd>{/if}
						{#if item.cost != null}<dt class="text-zinc-500">{(ITEM_TYPES[item.type]?.fields.cost ?? 'Cost').replace(/ \(£.*\)/, '')}</dt><dd>{formatMoney(item.cost)}</dd>{/if}
						{#if item.excess != null}<dt class="text-zinc-500">Excess</dt><dd>{formatMoney(item.excess)}</dd>{/if}
					</dl>
				{/if}
				{#if item.notes}<p class="mt-3 text-sm whitespace-pre-line text-zinc-600 dark:text-zinc-400">{item.notes}</p>{/if}
			</article>
		{/each}

		{#if canEdit}
			{#each missing as t (t)}
				<a href="/vehicles/{v.id}/items/new?type={t}" class="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-zinc-300 p-5 text-sm font-medium text-zinc-500 transition hover:border-emerald-500 hover:text-emerald-700 dark:border-zinc-700 dark:hover:border-emerald-500 dark:hover:text-emerald-400">
					+ Add {ITEM_TYPES[t].label}
				</a>
			{/each}
		{/if}
	</div>

	{#if canEdit}
		<div class="mt-4 flex flex-wrap items-center gap-2 text-sm">
			<span class="text-zinc-500">Add:</span>
			{#each ITEM_TYPE_ORDER.filter((t) => !missing.includes(t as (typeof missing)[number])) as t}
				<a href="/vehicles/{v.id}/items/new?type={t}" class="rounded-full border border-zinc-300 px-3 py-1 text-zinc-700 transition hover:border-emerald-500 hover:text-emerald-700 dark:border-zinc-700 dark:text-zinc-300 dark:hover:text-emerald-400">{ITEM_TYPES[t].label}</a>
			{/each}
		</div>
	{/if}
</section>

<!-- Vehicle details -->
<section class="mt-12">
	<h2 class="section-title">Details</h2>
	<div class="card mt-3 p-5">
		{#if details.length}
			<dl class="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
				{#each details as [label, value]}
					<div class="flex justify-between gap-4 border-b border-zinc-100 pb-2 dark:border-zinc-800">
						<dt class="text-zinc-500 dark:text-zinc-400">{label}</dt>
						<dd class="text-right font-medium">{value}</dd>
					</div>
				{/each}
			</dl>
		{:else}
			<p class="text-sm text-zinc-500">No details yet. {#if canEdit}<a href="/vehicles/{v.id}/edit" class="text-emerald-700 hover:underline dark:text-emerald-400">Add some</a>{/if}</p>
		{/if}
		{#if v.notes}<p class="mt-4 text-sm whitespace-pre-line text-zinc-600 dark:text-zinc-400">{v.notes}</p>{/if}
	</div>
</section>

<!-- Sharing -->
{#if isOwner}
	<section class="mt-12">
		<h2 class="section-title">Shared with</h2>
		<div class="card mt-3 p-5">
			{#if form?.shareError}<p class="alert-error mb-4">{form.shareError}</p>{/if}
			{#if form?.shareSuccess}<p class="alert-success mb-4">{form.shareSuccess}</p>{/if}
			<ul class="divide-y divide-zinc-100 dark:divide-zinc-800">
				{#each data.members as m (m.user_id)}
					<li class="flex flex-wrap items-center gap-3 py-2.5">
						<div class="min-w-0 flex-1">
							<p class="text-sm font-medium">{m.name}{#if m.user_id === data.user?.id}<span class="font-normal text-zinc-500"> (you)</span>{/if}</p>
							<p class="truncate text-xs text-zinc-500">{m.email}</p>
						</div>
						{#if m.user_id === data.user?.id}
							<span class="text-sm text-zinc-500">{roleLabels[m.role]}</span>
						{:else}
							<form method="POST" action="?/setRole" use:enhance>
								<input type="hidden" name="userId" value={m.user_id} />
								<select name="role" class="input w-auto py-1.5" value={m.role} onchange={(e) => e.currentTarget.form?.requestSubmit()} aria-label="Access for {m.name}">
									{#each Object.entries(roleLabels) as [value, label]}<option {value}>{label}</option>{/each}
								</select>
							</form>
							<form method="POST" action="?/unshare" use:enhance>
								<input type="hidden" name="userId" value={m.user_id} />
								<button class="btn-ghost px-3 py-1.5 text-red-600 dark:text-red-400">Remove</button>
							</form>
						{/if}
					</li>
				{/each}
			</ul>
			<form method="POST" action="?/share" use:enhance class="mt-4 flex flex-wrap gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
				<input class="input min-w-48 flex-1" name="email" type="email" placeholder="Their Glovebox email" required aria-label="Email to share with" />
				<select name="role" class="input w-auto" aria-label="Access level">
					<option value="viewer">Can view</option>
					<option value="editor">Can edit</option>
					<option value="owner">Owner</option>
				</select>
				<button class="btn-secondary">Share</button>
			</form>
		</div>
	</section>
{/if}
