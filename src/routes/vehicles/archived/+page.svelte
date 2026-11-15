<script lang="ts">
	import Plate from '$lib/components/Plate.svelte';
	import { formatDate, formatMiles, vehicleName } from '$lib/format';

	let { data } = $props();
</script>

<svelte:head><title>Archived vehicles · Glovebox</title></svelte:head>

<a href="/" class="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">← Dashboard</a>
<h1 class="mt-2 text-2xl font-semibold tracking-tight">Archived vehicles</h1>
<p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
	Vehicles you no longer have. Their history, costs and documents are kept. Open one to restore it.
</p>

{#if data.vehicles.length}
	<ul class="card mt-6 divide-y divide-zinc-100 dark:divide-zinc-800">
		{#each data.vehicles as v (v.id)}
			<li>
				<a href="/vehicles/{v.id}" class="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4 transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
					<span class="opacity-75 grayscale"><Plate registration={v.registration} /></span>
					<span class="min-w-0 flex-1">
						<span class="block truncate font-medium">{vehicleName(v)}</span>
						<span class="block truncate text-sm text-zinc-500">
							{[v.nickname ? [v.make, v.model].filter(Boolean).join(' ') : null, v.year, v.mileage != null ? formatMiles(v.mileage) : null].filter(Boolean).join(' · ')}
						</span>
					</span>
					<span class="text-right text-sm text-zinc-500">
						{v.archived_at ? formatDate(v.archived_at) : 'Archived'}
						{#if v.archive_note}<span class="block text-xs">{v.archive_note}</span>{/if}
					</span>
				</a>
			</li>
		{/each}
	</ul>
{:else}
	<p class="card mt-6 p-6 text-sm text-zinc-500">Nothing archived. When you sell a vehicle, archive it from its Edit page.</p>
{/if}
