<script lang="ts">
	import Plate from '$lib/components/Plate.svelte';
	import { formatDate, vehicleName } from '$lib/format';
	import { formatBytes } from '$lib/history';

	let { data } = $props();
	const v = $derived(data.vehicle);

	/** pdf-lib can only put PDFs, JPGs and PNGs into the pack. */
	const EMBEDDABLE = ['application/pdf', 'image/jpeg', 'image/png'];
	const typeLabel = (mime: string) => (mime === 'application/pdf' ? 'PDF' : mime.replace('image/', '').toUpperCase());
</script>

<svelte:head><title>Sale pack · {v.registration} · Glovebox</title></svelte:head>

<div class="mx-auto max-w-2xl">
	<a href="/vehicles/{v.id}" class="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">← {v.registration}</a>

	<div class="mt-3 flex flex-wrap items-center gap-3">
		<Plate registration={v.registration} />
		<h1 class="text-2xl font-semibold tracking-tight">Sale pack</h1>
	</div>
	<p class="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
		A PDF of {vehicleName(v)}’s history to give a buyer: its details, mileage, service and MOT history, and any receipts you choose. Policy numbers, key codes, finance and contacts are never included.
	</p>

	<form method="POST" action="/vehicles/{v.id}/sale-pack.pdf" class="mt-6 space-y-6">
		<section class="card p-6">
			<h2 class="section-title">Include</h2>
			<div class="mt-4 space-y-3 text-sm">
				<label class="flex items-start gap-3"><input type="checkbox" name="mileage" checked class="mt-0.5 size-4 accent-emerald-600" /><span><span class="font-medium">Mileage history</span><br /><span class="text-zinc-500">Every reading, oldest first. Any reading lower than the one before is flagged.</span></span></label>
				<label class="flex items-start gap-3"><input type="checkbox" name="service" checked disabled={!data.recordCount} class="mt-0.5 size-4 accent-emerald-600" /><span><span class="font-medium">Service and repair history</span><br /><span class="text-zinc-500">{data.recordCount ? `${data.recordCount} record${data.recordCount === 1 ? '' : 's'}` : 'Nothing recorded yet'}</span></span></label>
				{#if data.hasNotes}
					<label class="ml-7 flex items-start gap-3"><input type="checkbox" name="notes" checked class="mt-0.5 size-4 accent-emerald-600" /><span>Include the notes on each job</span></label>
				{/if}
				{#if data.hasCosts}
					<label class="ml-7 flex items-start gap-3"><input type="checkbox" name="costs" checked class="mt-0.5 size-4 accent-emerald-600" /><span>Include what each job cost</span></label>
				{/if}
				<label class="flex items-start gap-3"><input type="checkbox" name="mot" checked disabled={!data.motCount} class="mt-0.5 size-4 accent-emerald-600" /><span><span class="font-medium">MOT history</span><br /><span class="text-zinc-500">{data.motCount ? `${data.motCount} test${data.motCount === 1 ? '' : 's'} from the DVSA, with what happened to the latest advisories` : 'None on record (needs DVSA lookups)'}</span></span></label>
				{#if v.vin}
					<label class="flex items-start gap-3"><input type="checkbox" name="vin" checked class="mt-0.5 size-4 accent-emerald-600" /><span><span class="font-medium">VIN</span><br /><span class="text-zinc-500">Buyers use it to check the car’s history. It’s also stamped on the car.</span></span></label>
				{/if}
			</div>
		</section>

		{#if data.documents.length}
			<section class="card p-6">
				<h2 class="section-title">Attach documents</h2>
				<p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
					Added at the end of the PDF. Receipts attached to a service or repair are ticked. Think twice before adding your V5C, insurance documents or anything showing your address.
				</p>
				<ul class="mt-4 divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
					{#each data.documents as d (d.id)}
						{@const ok = EMBEDDABLE.includes(d.mime)}
						<li class="py-2">
							<label class="flex items-center gap-3 {ok ? '' : 'opacity-60'}">
								<input type="checkbox" name="doc" value={d.id} checked={ok && d.record_id != null} disabled={!ok} class="size-4 accent-emerald-600" />
								<span class="min-w-0 flex-1 truncate">{d.title}</span>
								<span class="shrink-0 text-xs text-zinc-500">{ok ? `${typeLabel(d.mime)} · ${formatBytes(d.size)} · ${formatDate(d.created_at.slice(0, 10))}` : `${typeLabel(d.mime)} can’t go in a PDF`}</span>
							</label>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		<section class="card p-6">
			<label class="section-title" for="note">A note for the buyer (optional)</label>
			<textarea id="note" name="note" rows="3" maxlength="2000" class="input mt-3 min-h-20" placeholder="e.g. Two keys. Cambelt done at 60,000. Always garaged."></textarea>
		</section>

		<div class="flex flex-wrap items-center gap-3">
			<button class="btn-primary">Download sale pack (PDF)</button>
			<span class="text-xs text-zinc-500">Check it before you send it on.</span>
		</div>
	</form>
</div>
