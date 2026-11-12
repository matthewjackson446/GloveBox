<script lang="ts">
	import ItemForm from '$lib/components/ItemForm.svelte';
	import Plate from '$lib/components/Plate.svelte';
	import { ITEM_TYPES } from '$lib/items';

	let { data, form } = $props();
</script>

<svelte:head><title>Add {ITEM_TYPES[data.type].label} · Glovebox</title></svelte:head>

<div class="mx-auto max-w-3xl">
	<a href="/vehicles/{data.vehicle.id}" class="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">← Back</a>
	<div class="mt-2 mb-6 flex items-center gap-3">
		<h1 class="text-2xl font-semibold tracking-tight">Add {ITEM_TYPES[data.type].label}</h1>
		<Plate registration={data.vehicle.registration} />
	</div>
	<ItemForm type={data.type} values={form?.values} error={form?.error} cancelHref="/vehicles/{data.vehicle.id}" submitLabel="Add {ITEM_TYPES[data.type].label}" />
</div>
