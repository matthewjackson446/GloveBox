<script lang="ts">
	import { enhance } from '$app/forms';
	import { ITEM_FIELDS, ITEM_TYPES, type ItemField } from '$lib/items';
	import type { DueItem } from '$lib/types';

	let {
		type,
		item,
		values,
		error,
		cancelHref,
		submitLabel,
		action
	}: {
		action?: string;
		type: string;
		item?: DueItem;
		values?: Record<string, string>;
		error?: string;
		cancelHref: string;
		submitLabel: string;
	} = $props();

	const def = $derived(ITEM_TYPES[type]);
	const fields = $derived(ITEM_FIELDS.filter((f) => def.fields[f]));
	const v = (key: ItemField) => values?.[key] ?? item?.[key] ?? '';

	const inputType: Partial<Record<ItemField, string>> = {
		due_date: 'date',
		start_date: 'date',
		phone: 'tel',
		emergency_phone: 'tel'
	};
	const inputMode: Partial<Record<ItemField, 'numeric' | 'decimal' | 'url'>> = {
		due_mileage: 'numeric',
		cost: 'decimal',
		excess: 'decimal',
		website: 'url'
	};
	/** Fields that should take the full width of the form. */
	const wide: ItemField[] = ['notes', 'label'];

	let busy = $state(false);
</script>

<form
	method="POST"
	{action}
	class="card space-y-6 p-6"
	use:enhance={() => {
		busy = true;
		return async ({ update }) => {
			await update({ reset: false });
			busy = false;
		};
	}}
>
	{#if error}<p class="alert-error" role="alert">{error}</p>{/if}

	<div class="grid gap-4 sm:grid-cols-2">
		{#each fields as f (f)}
			<div class={wide.includes(f) ? 'sm:col-span-2' : ''}>
				<label class="label" for={f}>
					{def.fields[f]}
					{#if f === 'emergency_phone'}<span class="ml-1 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-red-700 uppercase dark:bg-red-950 dark:text-red-400">Emergency card</span>{/if}
				</label>
				{#if f === 'notes'}
					<textarea class="input min-h-24" id={f} name={f} rows="3" placeholder={def.hints?.[f]}>{v(f)}</textarea>
				{:else}
					<input
						class="input"
						id={f}
						name={f}
						type={inputType[f] ?? 'text'}
						inputmode={inputMode[f]}
						placeholder={def.hints?.[f]}
						required={type === 'other' && f === 'label'}
						value={v(f)}
					/>
				{/if}
			</div>
		{/each}
	</div>

	<div class="flex justify-end gap-3">
		<a href={cancelHref} class="btn-ghost">Cancel</a>
		<button class="btn-primary" disabled={busy}>{busy ? 'Saving…' : submitLabel}</button>
	</div>
</form>
