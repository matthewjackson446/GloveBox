<script lang="ts">
	import { enhance } from '$app/forms';
	import VehicleForm from '$lib/components/VehicleForm.svelte';

	let { data, form } = $props();
</script>

<svelte:head><title>Edit {data.vehicle.registration} · Glovebox</title></svelte:head>

<div class="mx-auto max-w-3xl">
	<a href="/vehicles/{data.vehicle.id}" class="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">← {data.vehicle.registration}</a>
	<h1 class="mt-2 mb-6 text-2xl font-semibold tracking-tight">Edit vehicle</h1>

	<VehicleForm vehicle={data.vehicle} values={form?.values} error={form?.error} submitLabel="Save changes" action="?/save" />

	{#if data.vehicle.role === 'owner'}
		<section class="mt-12 rounded-2xl border border-red-200 p-6 dark:border-red-900/60">
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
