<script lang="ts">
	import VehicleForm from '$lib/components/VehicleForm.svelte';

	let { data, form } = $props();
</script>

<svelte:head><title>Add vehicle · Glovebox</title></svelte:head>

<div class="mx-auto max-w-3xl">
	<a href="/" class="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">← Dashboard</a>
	<h1 class="mt-2 mb-6 text-2xl font-semibold tracking-tight">Add a vehicle</h1>
	<VehicleForm
		values={form?.values}
		error={form?.error}
		lookupEnabled={data.lookupsEnabled}
		lookupFacts={form && 'lookup' in form ? form.lookup?.facts : undefined}
		lookupWarnings={form && 'lookup' in form ? form.lookup?.warnings : undefined}
		submitLabel="Add vehicle"
		action="?/create"
	/>
</div>
