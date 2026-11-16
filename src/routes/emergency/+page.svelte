<script lang="ts">
	import Plate from '$lib/components/Plate.svelte';
	import OfflineStatus from '$lib/components/OfflineStatus.svelte';
	import { vehicleName } from '$lib/format';

	let { data } = $props();
</script>

<svelte:head><title>Emergency cards · Glovebox</title></svelte:head>

<div class="mx-auto max-w-xl">
	<a href="tel:999" class="flex items-center justify-between rounded-2xl bg-red-600 px-5 py-4 text-white shadow-sm transition hover:bg-red-500">
		<div>
			<p class="text-lg font-bold">Someone hurt or in danger?</p>
			<p class="text-sm text-red-100">Get to safety, then call 999.</p>
		</div>
		<span class="rounded-xl bg-white/20 px-4 py-2 text-xl font-bold">999</span>
	</a>

	<h1 class="mt-8 text-2xl font-semibold tracking-tight">Emergency cards</h1>
	<p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Breakdown and claims lines, policy numbers and what you’ll be asked for.</p>

	{#if data.vehicles.length}
		<ul class="mt-4 space-y-3">
			{#each data.vehicles as v (v.id)}
				<li>
					<!-- A full page load, so the saved copy is used when there's no signal. -->
					<a href="/vehicles/{v.id}/emergency" data-sveltekit-reload class="card flex items-center gap-4 p-4 transition hover:shadow-md">
						<Plate registration={v.registration} />
						<span class="min-w-0 flex-1 truncate font-semibold">{vehicleName(v)}</span>
						<span class="text-sm font-medium text-red-700 dark:text-red-400">Open →</span>
					</a>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="card mt-4 p-5 text-sm text-zinc-500">Add a vehicle first, then its emergency card will appear here.</p>
	{/if}

	<OfflineStatus class="mt-6" />
</div>
