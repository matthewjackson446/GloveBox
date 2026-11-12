<script lang="ts">
	import { enhance } from '$app/forms';
	import ItemForm from '$lib/components/ItemForm.svelte';
	import Plate from '$lib/components/Plate.svelte';
	import { isItemType, itemTitle } from '$lib/items';

	let { data, form } = $props();
	const title = $derived(itemTitle(data.item));
</script>

<svelte:head><title>Edit {title} · Glovebox</title></svelte:head>

<div class="mx-auto max-w-3xl">
	<a href="/vehicles/{data.vehicle.id}" class="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">← Back</a>
	<div class="mt-2 mb-6 flex items-center gap-3">
		<h1 class="text-2xl font-semibold tracking-tight">Edit {title}</h1>
		<Plate registration={data.vehicle.registration} />
	</div>

	<ItemForm
		type={isItemType(data.item.type) ? data.item.type : 'other'}
		item={data.item}
		values={form?.values}
		error={form?.error}
		action="?/save"
		cancelHref="/vehicles/{data.vehicle.id}"
		submitLabel="Save changes"
	/>

	<form
		method="POST"
		action="?/delete"
		class="mt-6 flex justify-end"
		use:enhance={({ cancel }) => {
			if (!confirm(`Delete ${title}?`)) cancel();
		}}
	>
		<button class="btn-danger">Delete {title}</button>
	</form>
</div>
