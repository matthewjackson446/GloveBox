<script lang="ts">
	import { enhance } from '$app/forms';
	import DocumentList from '$lib/components/DocumentList.svelte';
	import Plate from '$lib/components/Plate.svelte';
	import RecordForm from '$lib/components/RecordForm.svelte';

	let { data, form } = $props();
</script>

<svelte:head><title>Edit history · {data.vehicle.registration} · Glovebox</title></svelte:head>

<div class="mx-auto max-w-3xl">
	<a href="/vehicles/{data.vehicle.id}#history" class="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">← Back</a>
	<div class="mt-2 mb-6 flex items-center gap-3">
		<h1 class="text-2xl font-semibold tracking-tight">{data.record.title}</h1>
		<Plate registration={data.vehicle.registration} />
	</div>

	{#if data.uploadError}<p class="alert-error mb-4">The entry was saved, but the file wasn’t: {data.uploadError}</p>{/if}

	{#if data.documents.length}
		<section class="mb-6">
			<h2 class="section-title mb-2">Attached</h2>
			<DocumentList vehicleId={data.vehicle.id} documents={data.documents} canEdit deleteAction="?/deleteDoc" />
		</section>
	{/if}

	<RecordForm
		record={data.record}
		values={form?.values}
		error={form?.error}
		action="?/save"
		cancelHref="/vehicles/{data.vehicle.id}#history"
		submitLabel="Save changes"
		allowUpload
		accept={data.accept}
	/>

	<form
		method="POST"
		action="?/delete"
		class="mt-6 flex justify-end"
		use:enhance={({ cancel }) => {
			if (!confirm('Delete this history entry? Any attached files stay in the vehicle’s documents.')) cancel();
		}}
	>
		<button class="btn-danger">Delete entry</button>
	</form>
</div>
