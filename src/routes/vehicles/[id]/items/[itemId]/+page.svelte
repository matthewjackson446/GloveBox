<script lang="ts">
	import { enhance } from '$app/forms';
	import DocumentList from '$lib/components/DocumentList.svelte';
	import ItemForm from '$lib/components/ItemForm.svelte';
	import Plate from '$lib/components/Plate.svelte';
	import PriceHistory from '$lib/components/PriceHistory.svelte';
	import UploadForm from '$lib/components/UploadForm.svelte';
	import { isItemType, isRenewable, itemTitle } from '$lib/items';

	let { data, form } = $props();
	const title = $derived(itemTitle(data.item));
</script>

<svelte:head><title>Edit {title} · Glovebox</title></svelte:head>

<div class="mx-auto max-w-3xl">
	<a href="/vehicles/{data.vehicle.id}" class="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">← Back</a>
	<div class="mt-2 mb-6 flex flex-wrap items-center gap-3">
		<h1 class="text-2xl font-semibold tracking-tight">Edit {title}</h1>
		<Plate registration={data.vehicle.registration} />
		{#if isRenewable(data.item.type)}
			<a href="/vehicles/{data.vehicle.id}/items/{data.item.id}/renew" class="btn-primary ml-auto">Renew…</a>
		{/if}
	</div>

	<ItemForm
		type={isItemType(data.item.type) ? data.item.type : 'other'}
		item={data.item}
		values={form && 'values' in form ? form.values : undefined}
		error={form && 'error' in form ? form.error : undefined}
		action="?/save"
		cancelHref="/vehicles/{data.vehicle.id}"
		submitLabel="Save changes"
	/>

	{#if data.history.length}
		<section class="mt-10">
			<h2 class="section-title mb-2">Price history</h2>
			<PriceHistory item={data.item} history={data.history} />
		</section>
	{/if}

	<section class="mt-10">
		<h2 class="section-title mb-2">Documents</h2>
		{#if data.documents.length}
			<div class="mb-3"><DocumentList vehicleId={data.vehicle.id} documents={data.documents} canEdit deleteAction="?/deleteDoc" /></div>
		{/if}
		<UploadForm
			action="?/uploadDoc"
			accept={data.accept}
			error={form && 'uploadError' in form ? form.uploadError : undefined}
			success={form && 'uploadSuccess' in form ? form.uploadSuccess : undefined}
		/>
	</section>

	<form
		method="POST"
		action="?/delete"
		class="mt-10 flex justify-end"
		use:enhance={({ cancel }) => {
			if (!confirm(`Delete ${title}? Its documents stay on the vehicle.`)) cancel();
		}}
	>
		<button class="btn-danger">Delete {title}</button>
	</form>
</div>
