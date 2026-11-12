<script lang="ts">
	import { enhance } from '$app/forms';
	import Plate from '$lib/components/Plate.svelte';
	import { formatDate, formatMoney } from '$lib/format';
	import { ITEM_TYPES, itemTitle } from '$lib/items';

	let { data, form } = $props();

	const item = $derived(data.item);
	const def = $derived(ITEM_TYPES[item.type]);
	const v = (k: string, fallback: string | number | null | undefined) => form?.values?.[k] ?? (fallback == null ? '' : String(fallback));
	let busy = $state(false);
</script>

<svelte:head><title>Renew {itemTitle(item)} · Glovebox</title></svelte:head>

<div class="mx-auto max-w-3xl">
	<a href="/vehicles/{data.vehicle.id}" class="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">← Back</a>
	<div class="mt-2 mb-2 flex items-center gap-3">
		<h1 class="text-2xl font-semibold tracking-tight">Renew {itemTitle(item)}</h1>
		<Plate registration={data.vehicle.registration} />
	</div>
	<p class="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
		The current period{item.due_date ? ` (ending ${formatDate(item.due_date)})` : ''}{item.cost != null ? ` at ${formatMoney(item.cost)}` : ''} is kept in this item’s history, so you can compare prices next year. Reminders start again for the new date.
	</p>

	<form
		method="POST"
		class="card space-y-5 p-6"
		use:enhance={() => {
			busy = true;
			return async ({ update }) => {
				await update({ reset: false });
				busy = false;
			};
		}}
	>
		{#if form?.error}<p class="alert-error">{form.error}</p>{/if}
		<div class="grid gap-4 sm:grid-cols-2">
			{#if def.fields.provider}
				<div>
					<label class="label" for="provider">{def.fields.provider}</label>
					<input class="input" id="provider" name="provider" value={v('provider', item.provider)} />
					<p class="mt-1.5 text-xs text-zinc-500">Change it if you’ve switched provider.</p>
				</div>
			{/if}
			{#if def.fields.reference}
				<div>
					<label class="label" for="reference">{def.fields.reference}</label>
					<input class="input" id="reference" name="reference" value={v('reference', item.reference)} />
				</div>
			{/if}
			<div>
				<label class="label" for="start_date">New period starts</label>
				<input class="input" id="start_date" name="start_date" type="date" value={v('start_date', data.defaults.start_date)} />
			</div>
			<div>
				<label class="label" for="due_date">{def.fields.due_date ?? 'Due date'}</label>
				<input class="input" id="due_date" name="due_date" type="date" required value={v('due_date', data.defaults.due_date)} />
			</div>
			{#if def.fields.cost}
				<div>
					<label class="label" for="cost">{def.fields.cost.replace(/\s*\(£.*\)/, '')} (£)</label>
					<input class="input" id="cost" name="cost" inputmode="decimal" placeholder={item.cost != null ? `Last time ${formatMoney(item.cost)}` : ''} value={v('cost', null)} />
				</div>
			{/if}
			{#if def.fields.excess}
				<div>
					<label class="label" for="excess">Excess (£)</label>
					<input class="input" id="excess" name="excess" inputmode="decimal" value={v('excess', item.excess)} />
				</div>
			{/if}
			<div class="sm:col-span-2">
				<label class="label" for="notes">Notes</label>
				<textarea class="input min-h-20" id="notes" name="notes" rows="3">{v('notes', item.notes)}</textarea>
			</div>
		</div>
		<div class="flex justify-end gap-3">
			<a href="/vehicles/{data.vehicle.id}" class="btn-ghost">Cancel</a>
			<button class="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Renew'}</button>
		</div>
	</form>
</div>
