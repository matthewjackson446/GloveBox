<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatTimestamp } from '$lib/format';
	import { formatBytes } from '$lib/history';
	import type { DocumentRow } from '$lib/types';

	let {
		vehicleId,
		documents,
		canEdit = false,
		deleteAction = '?/deleteDocument',
		linkLabel
	}: {
		vehicleId: number;
		documents: DocumentRow[];
		canEdit?: boolean;
		deleteAction?: string;
		/** Optional: describe what a document is attached to. */
		linkLabel?: (d: DocumentRow) => string | null;
	} = $props();

	const href = (d: DocumentRow) => `/vehicles/${vehicleId}/documents/${d.id}`;
	const isImage = (d: DocumentRow) => d.mime.startsWith('image/') && d.mime !== 'image/heic';
</script>

<ul class="card divide-y divide-zinc-100 dark:divide-zinc-800">
	{#each documents as d (d.id)}
		<li class="flex items-center gap-3 px-4 py-3">
			<a href={href(d)} target="_blank" rel="noopener" class="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950" aria-hidden="true" tabindex="-1">
				{#if isImage(d)}
					<img src={href(d)} alt="" loading="lazy" class="size-full object-cover" />
				{:else}
					<span class="text-[10px] font-bold text-red-600 dark:text-red-400">{d.mime === 'application/pdf' ? 'PDF' : 'IMG'}</span>
				{/if}
			</a>
			<div class="min-w-0 flex-1">
				<a href={href(d)} target="_blank" rel="noopener" class="block truncate text-sm font-medium hover:text-emerald-700 dark:hover:text-emerald-400">{d.title}</a>
				<p class="truncate text-xs text-zinc-500">
					{formatBytes(d.size)} · {formatTimestamp(d.created_at)}{#if linkLabel?.(d)}{' · '}{linkLabel(d)}{/if}
				</p>
			</div>
			<a href="{href(d)}?download" class="btn-ghost px-3 py-1.5" aria-label="Download {d.title}">Download</a>
			{#if canEdit}
				<form
					method="POST"
					action={deleteAction}
					use:enhance={({ cancel }) => {
						if (!confirm(`Delete “${d.title}”? This can’t be undone.`)) cancel();
					}}
				>
					<input type="hidden" name="docId" value={d.id} />
					<button class="btn-ghost px-3 py-1.5 text-red-600 dark:text-red-400">Delete</button>
				</form>
			{/if}
		</li>
	{/each}
</ul>
