<script lang="ts">
	import { enhance } from '$app/forms';
	import { RECORD_KINDS } from '$lib/history';
	import { todayISO } from '$lib/status';
	import type { ServiceRecord } from '$lib/types';

	let {
		record,
		values,
		error,
		action,
		cancelHref,
		submitLabel,
		allowUpload = false,
		accept = ''
	}: {
		record?: ServiceRecord;
		values?: Record<string, string>;
		error?: string;
		action?: string;
		cancelHref: string;
		submitLabel: string;
		allowUpload?: boolean;
		accept?: string;
	} = $props();

	const v = (k: keyof ServiceRecord, fallback = '') => values?.[k] ?? (record?.[k] != null ? String(record[k]) : fallback);
	let busy = $state(false);
</script>

<form
	method="POST"
	{action}
	enctype="multipart/form-data"
	class="card space-y-5 p-6"
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
		<div>
			<label class="label" for="kind">Type</label>
			<select class="input" id="kind" name="kind" value={v('kind', 'service')}>
				{#each Object.entries(RECORD_KINDS) as [value, label]}<option {value}>{label}</option>{/each}
			</select>
		</div>
		<div>
			<label class="label" for="date">Date</label>
			<input class="input" id="date" name="date" type="date" required max={todayISO()} value={v('date', todayISO())} />
		</div>
		<div class="sm:col-span-2">
			<label class="label" for="title">What was done</label>
			<input class="input" id="title" name="title" maxlength="120" placeholder="e.g. Full service, front brake pads & discs" value={v('title')} />
		</div>
		<div>
			<label class="label" for="mileage">Mileage</label>
			<input class="input" id="mileage" name="mileage" inputmode="numeric" value={v('mileage')} />
		</div>
		<div>
			<label class="label" for="cost">Cost (£)</label>
			<input class="input" id="cost" name="cost" inputmode="decimal" value={v('cost')} />
		</div>
		<div class="sm:col-span-2">
			<label class="label" for="garage">Garage / who did it</label>
			<input class="input" id="garage" name="garage" maxlength="120" placeholder="e.g. Smith’s Autos, or DIY" value={v('garage')} />
		</div>
		<div class="sm:col-span-2">
			<label class="label" for="notes">Notes</label>
			<textarea class="input min-h-24" id="notes" name="notes" rows="3" placeholder="Parts used, oil grade, advice from the garage…">{v('notes')}</textarea>
		</div>
		{#if allowUpload}
			<div class="sm:col-span-2">
				<label class="label" for="file">Attach receipt or invoice <span class="font-normal text-zinc-400">(optional)</span></label>
				<input class="input file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-1 file:text-sm dark:file:bg-zinc-800" id="file" name="file" type="file" {accept} />
				<p class="mt-1.5 text-xs text-zinc-500">PDF or photo, up to 20 MB.</p>
			</div>
		{/if}
	</div>
	<div class="flex justify-end gap-3">
		<a href={cancelHref} class="btn-ghost">Cancel</a>
		<button class="btn-primary" disabled={busy}>{busy ? 'Saving…' : submitLabel}</button>
	</div>
</form>
