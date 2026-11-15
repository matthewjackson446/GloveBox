<script lang="ts">
	import { enhance } from '$app/forms';
	import VehicleForm from '$lib/components/VehicleForm.svelte';
	import { todayISO } from '$lib/status';

	const today = todayISO();

	let { data, form } = $props();
</script>

<svelte:head><title>Edit {data.vehicle.registration} · Glovebox</title></svelte:head>

<div class="mx-auto max-w-3xl">
	<a href="/vehicles/{data.vehicle.id}" class="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">← {data.vehicle.registration}</a>
	<h1 class="mt-2 mb-6 text-2xl font-semibold tracking-tight">Edit vehicle</h1>

	<VehicleForm vehicle={data.vehicle} values={form?.values} error={form?.error} submitLabel="Save changes" action="?/save" lookupEnabled={data.lookupsEnabled} />

	{#if data.vehicle.role === 'owner' && !data.vehicle.archived}
		<section class="mt-12 rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
			<h2 class="font-semibold">Sold it? Archive it</h2>
			<p class="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
				Takes it off your dashboard, reminders, calendar and the nightly DVLA check, but keeps its history, costs and documents. You can restore it at any time.
			</p>
			<form method="POST" action="?/archive" use:enhance class="mt-4 grid gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-end">
				<div>
					<label class="label" for="archived_at">Date</label>
					<input class="input" id="archived_at" name="archived_at" type="date" max={today} value={today} />
				</div>
				<div>
					<label class="label" for="archive_note">Reason <span class="font-normal text-zinc-400">(optional)</span></label>
					<input class="input" id="archive_note" name="archive_note" maxlength="200" placeholder="e.g. Sold, part-exchanged, scrapped" />
				</div>
				<button class="btn-secondary">Archive {data.vehicle.registration}</button>
			</form>
			{#if form && 'archiveError' in form}<p class="alert-error mt-3">{form.archiveError}</p>{/if}
		</section>
	{/if}

	{#if data.vehicle.role === 'owner'}
		<section class="mt-8 rounded-2xl border border-red-200 p-6 dark:border-red-900/60">
			<h2 class="font-semibold text-red-700 dark:text-red-400">Delete vehicle</h2>
			<p class="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
				Removes this vehicle and all its renewals for everyone it’s shared with. This can’t be undone.
			</p>
			<form
				method="POST"
				action="?/delete"
				class="mt-4"
				use:enhance={({ cancel }) => {
					if (!confirm(`Delete ${data.vehicle.registration} and everything recorded against it?`)) cancel();
				}}
			>
				<button class="btn-danger">Delete {data.vehicle.registration}</button>
			</form>
		</section>
	{/if}
</div>
