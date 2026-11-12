<script lang="ts">
	import Plate from '$lib/components/Plate.svelte';
	import RecordForm from '$lib/components/RecordForm.svelte';

	let { data, form } = $props();
</script>

<svelte:head><title>Add history · {data.vehicle.registration} · Glovebox</title></svelte:head>

<div class="mx-auto max-w-3xl">
	<a href="/vehicles/{data.vehicle.id}#history" class="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">← Back</a>
	<div class="mt-2 mb-6 flex items-center gap-3">
		<h1 class="text-2xl font-semibold tracking-tight">Add to service history</h1>
		<Plate registration={data.vehicle.registration} />
	</div>
	<RecordForm values={form?.values} error={form?.error} cancelHref="/vehicles/{data.vehicle.id}#history" submitLabel="Add to history" allowUpload accept={data.accept} />
</div>
