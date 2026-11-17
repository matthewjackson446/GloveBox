<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import StatusDot from '$lib/components/StatusDot.svelte';
	import StatusText from '$lib/components/StatusText.svelte';
	import { addYears, DRIVER_ITEM_ORDER, DRIVER_ITEM_TYPES, driverItemTitle } from '$lib/drivers';
	import { formatDate } from '$lib/format';
	import { itemState } from '$lib/status';
	import type { DriverItem } from '$lib/types';

	let { data, form } = $props();

	/** Which inline form is open: `add-<driverId>`, `edit-<itemId>`, `renew-<itemId>`, `rename-<driverId>`. */
	let open = $state<string | null>(null);
	let addType = $state<Record<number, string>>({});
	let editType = $state<Record<number, string>>({});

	const stateOf = (i: DriverItem) => itemState({ due_date: i.due_date, due_mileage: null }, null);
	const suggest = (i: DriverItem) => (i.due_date ? addYears(i.due_date, DRIVER_ITEM_TYPES[i.type]?.years ?? 1) : '');

	/** Close the open form after a successful submit. */
	const closeOnSuccess = () => async ({ result, update }: { result: { type: string }; update: () => Promise<void> }) => {
		await update();
		if (result.type === 'success') open = null;
	};
	const border = { overdue: 'border-l-red-500', soon: 'border-l-amber-400', ok: 'border-l-emerald-500', none: 'border-l-zinc-300 dark:border-l-zinc-700' };
</script>

<svelte:head><title>Drivers · Glovebox</title></svelte:head>

<div class="flex flex-wrap items-end justify-between gap-4">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">Drivers</h1>
		<p class="mt-1 max-w-xl text-sm text-zinc-500 dark:text-zinc-400">
			Renewals that belong to a person rather than a vehicle: licence photocards, Driver CPC, tachograph cards and medicals. They’re in your reminders and calendar too. Only you can see the people you add here.
		</p>
	</div>
</div>

{#if form?.person?.success}<p class="alert-success mt-4">{form.person.success}</p>{/if}

{#each data.drivers as d (d.id)}
	<section class="mt-8" id="driver-{d.id}">
		<div class="flex flex-wrap items-center justify-between gap-3">
			{#if open === `rename-${d.id}`}
				<form method="POST" action="?/renameDriver" use:enhance={closeOnSuccess} class="flex flex-wrap gap-2">
					<input type="hidden" name="driverId" value={d.id} />
					<input class="input" name="name" value={d.name} maxlength="60" required aria-label="Name" />
					<button class="btn-primary">Save</button>
					<button type="button" class="btn-ghost" onclick={() => (open = null)}>Cancel</button>
				</form>
			{:else}
				<h2 class="text-lg font-semibold">{d.name}</h2>
				<div class="flex gap-1 text-sm">
					<button type="button" class="btn-ghost px-3 py-1.5" onclick={() => (open = `rename-${d.id}`)}>Rename</button>
					<form method="POST" action="?/deleteDriver" use:enhance onsubmit={(e) => { if (!confirm(`Remove ${d.name} and all their renewals?`)) e.preventDefault(); }}>
						<input type="hidden" name="driverId" value={d.id} />
						<button class="btn-ghost px-3 py-1.5 text-red-700 dark:text-red-400">Remove</button>
					</form>
				</div>
			{/if}
		</div>

		<div class="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
			{#each d.items as i (i.id)}
				{@const st = stateOf(i)}
				{@const def = DRIVER_ITEM_TYPES[i.type]}
				<article class="card border-l-4 p-5 {border[st.status]}" id="driver-item-{i.id}">
					{#if open === `edit-${i.id}`}
						{@const v = form?.edit?.itemId === i.id ? form.edit.values : undefined}
						{@const t = editType[i.id] ?? v?.type ?? i.type}
						<form method="POST" action="?/updateItem" use:enhance={closeOnSuccess} class="space-y-3">
							<input type="hidden" name="itemId" value={i.id} />
							{#if form?.edit?.itemId === i.id && form.edit.error}<p class="alert-error">{form.edit.error}</p>{/if}
							<div>
								<label class="label" for="type-{i.id}">Renewal</label>
								<select class="input" id="type-{i.id}" name="type" value={t} onchange={(e) => (editType[i.id] = e.currentTarget.value)}>
									{#each DRIVER_ITEM_ORDER as k}<option value={k}>{DRIVER_ITEM_TYPES[k].label}</option>{/each}
								</select>
							</div>
							{#if t === 'other'}
								<div><label class="label" for="label-{i.id}">Name</label><input class="input" id="label-{i.id}" name="label" maxlength="60" value={v?.label ?? i.label ?? ''} /></div>
							{/if}
							<div><label class="label" for="due-{i.id}">{DRIVER_ITEM_TYPES[t]?.dueLabel ?? 'Due'}</label><input class="input" id="due-{i.id}" name="due_date" type="date" required value={v?.due_date ?? i.due_date ?? ''} /></div>
							<div><label class="label" for="ref-{i.id}">Reference (optional)</label><input class="input" id="ref-{i.id}" name="reference" maxlength="60" value={v?.reference ?? i.reference ?? ''} /></div>
							<div><label class="label" for="notes-{i.id}">Notes (optional)</label><textarea class="input min-h-16" id="notes-{i.id}" name="notes" rows="2">{v?.notes ?? i.notes ?? ''}</textarea></div>
							<div class="flex gap-2">
								<button class="btn-primary">Save</button>
								<button type="button" class="btn-ghost" onclick={() => (open = null)}>Cancel</button>
								<button
									class="btn-ghost ml-auto text-red-700 dark:text-red-400"
									formaction="?/deleteItem"
									formnovalidate
									onclick={(e) => { if (!confirm(`Delete ${driverItemTitle(i)}?`)) e.preventDefault(); }}
								>Delete</button>
							</div>
						</form>
					{:else}
						<div class="flex items-start justify-between gap-3">
							<div class="min-w-0">
								<div class="flex items-center gap-2">
									<StatusDot status={st.status} />
									<h3 class="font-semibold">{driverItemTitle(i)}</h3>
								</div>
								<p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{def?.dueLabel ?? 'Due'} {formatDate(i.due_date)}</p>
								<StatusText state={st} />
							</div>
							<div class="-mt-1 -mr-2 flex shrink-0">
								<button type="button" class="btn-ghost px-3 py-1.5" onclick={() => (open = `renew-${i.id}`)}>Renew</button>
								<button type="button" class="btn-ghost px-3 py-1.5" onclick={() => (open = `edit-${i.id}`)}>Edit</button>
							</div>
						</div>
						{#if form?.edit?.itemId === i.id && form.edit.success}<p class="mt-2 text-sm text-emerald-700 dark:text-emerald-400">{form.edit.success}</p>{/if}
						{#if open === `renew-${i.id}`}
							<form method="POST" action="?/renewItem" use:enhance={closeOnSuccess} class="mt-4 space-y-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
								<input type="hidden" name="itemId" value={i.id} />
								<label class="label" for="renew-{i.id}">New {(def?.dueLabel ?? 'due date').toLowerCase()} date</label>
								<div class="flex flex-wrap gap-2">
									<input class="input w-auto" id="renew-{i.id}" name="due_date" type="date" required value={suggest(i)} />
									<button class="btn-primary">Renew</button>
									<button type="button" class="btn-ghost" onclick={() => (open = null)}>Cancel</button>
								</div>
								{#if def?.years}<p class="text-xs text-zinc-500">Filled in {def.years} year{def.years === 1 ? '' : 's'} on. Change it to the date on the new card if it’s different.</p>{/if}
							</form>
						{/if}
						{#if i.reference || i.notes || def?.link}
							<div class="mt-3 space-y-1 border-t border-zinc-100 pt-3 text-sm dark:border-zinc-800">
								{#if i.reference}<p><span class="text-zinc-500">Reference</span> <span class="font-mono text-[13px]">{i.reference}</span></p>{/if}
								{#if i.notes}<p class="whitespace-pre-line text-zinc-600 dark:text-zinc-400">{i.notes}</p>{/if}
								{#if def?.link}<p><a class="text-emerald-700 hover:underline dark:text-emerald-400" href={def.link.href} target="_blank" rel="noopener noreferrer">{def.link.text} ↗</a></p>{/if}
							</div>
						{/if}
					{/if}
				</article>
			{/each}

			{#if open === `add-${d.id}`}
				{@const v = form?.item?.driverId === d.id ? form.item.values : undefined}
				{@const t = addType[d.id] ?? v?.type ?? 'photocard'}
				<form method="POST" action="?/addItem" use:enhance={closeOnSuccess} class="card space-y-3 p-5">
					<input type="hidden" name="driverId" value={d.id} />
					{#if form?.item?.driverId === d.id && form.item.error}<p class="alert-error">{form.item.error}</p>{/if}
					<div>
						<label class="label" for="add-type-{d.id}">Renewal</label>
						<select class="input" id="add-type-{d.id}" name="type" value={t} onchange={(e) => (addType[d.id] = e.currentTarget.value)}>
							{#each DRIVER_ITEM_ORDER as k}<option value={k}>{DRIVER_ITEM_TYPES[k].label}</option>{/each}
						</select>
						<p class="mt-1 text-xs text-zinc-500">{DRIVER_ITEM_TYPES[t]?.hint}</p>
					</div>
					{#if t === 'other'}
						<div><label class="label" for="add-label-{d.id}">Name</label><input class="input" id="add-label-{d.id}" name="label" maxlength="60" placeholder="e.g. Taxi badge" value={v?.label ?? ''} /></div>
					{/if}
					<div><label class="label" for="add-due-{d.id}">{DRIVER_ITEM_TYPES[t]?.dueLabel ?? 'Due'}</label><input class="input" id="add-due-{d.id}" name="due_date" type="date" required value={v?.due_date ?? ''} /></div>
					<div><label class="label" for="add-ref-{d.id}">Reference (optional)</label><input class="input" id="add-ref-{d.id}" name="reference" maxlength="60" placeholder="e.g. card number" value={v?.reference ?? ''} /></div>
					<div class="flex gap-2"><button class="btn-primary">Add</button><button type="button" class="btn-ghost" onclick={() => (open = null)}>Cancel</button></div>
				</form>
			{:else}
				<button type="button" onclick={() => (open = `add-${d.id}`)} class="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-zinc-300 p-5 text-sm font-medium text-zinc-500 transition hover:border-emerald-500 hover:text-emerald-700 dark:border-zinc-700 dark:hover:border-emerald-500 dark:hover:text-emerald-400">
					+ Add a renewal for {d.name}
				</button>
			{/if}
		</div>
	</section>
{/each}

<section class="mt-10">
	{#if form?.person?.error}<p class="alert-error mb-3">{form.person.error}</p>{/if}
	<form method="POST" action="?/addDriver" use:enhance class="card flex flex-wrap items-end gap-3 p-5">
		<div class="min-w-48 flex-1">
			<label class="label" for="new-name">{data.drivers.length ? 'Add another person' : 'Start with yourself'}</label>
			<input class="input" id="new-name" name="name" maxlength="60" required value={data.drivers.length ? '' : (page.data.user?.name ?? '')} placeholder="Name" />
		</div>
		<button class="btn-primary">Add person</button>
	</form>
</section>
