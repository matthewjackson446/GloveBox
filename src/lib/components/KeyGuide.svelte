<script lang="ts">
	import type { Guide } from '$lib/lookupGuide';

	let { guide, open = false }: { guide: Guide; open?: boolean } = $props();
</script>

<details class="group mt-3 rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/60" {open}>
	<summary class="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium select-none">
		<svg viewBox="0 0 20 20" class="size-4 shrink-0 text-zinc-400 transition group-open:rotate-90" fill="currentColor" aria-hidden="true"><path d="M7.2 4.2a1 1 0 0 1 1.4 0l5 5a1 1 0 0 1 0 1.4l-5 5a1 1 0 1 1-1.4-1.4L11.5 10 7.2 5.6a1 1 0 0 1 0-1.4" /></svg>
		How to get your own {guide.title} key
	</summary>
	<div class="space-y-4 px-4 pb-4 text-sm">
		<div class="flex flex-wrap gap-2">
			{#each guide.links as link, i}
				<a href={link.href} target="_blank" rel="noopener noreferrer" class={i === 0 ? 'btn-primary py-1.5' : 'btn-secondary py-1.5'}>
					{link.label}
					<svg viewBox="0 0 20 20" class="size-3.5" fill="currentColor" aria-hidden="true"><path d="M11 3a1 1 0 1 0 0 2h2.6l-6.3 6.3a1 1 0 1 0 1.4 1.4L15 6.4V9a1 1 0 1 0 2 0V4a1 1 0 0 0-1-1zM5 5a2 2 0 0 0-2 2v8c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2v-3a1 1 0 1 0-2 0v3H5V7h3a1 1 0 0 0 0-2z" /></svg>
				</a>
			{/each}
		</div>
		<ol class="list-decimal space-y-1.5 pl-5 text-zinc-700 dark:text-zinc-300">
			{#each guide.steps as step}<li>{step}</li>{/each}
		</ol>
		<ul class="space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
			{#each guide.notes as note}<li>• {note}</li>{/each}
		</ul>
	</div>
</details>
