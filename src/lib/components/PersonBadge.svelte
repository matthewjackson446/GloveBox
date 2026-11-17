<script lang="ts">
	/** Stands in for a number plate on rows that belong to a person, not a vehicle. */
	let { name, class: className = '' }: { name: string; class?: string } = $props();
</script>

<span class="inline-flex max-w-full items-center gap-1 rounded-md border border-zinc-300 bg-white px-1.5 py-0.5 text-xs font-semibold text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 {className}" title={name}>
	<svg viewBox="0 0 20 20" class="size-3.5 shrink-0" fill="currentColor" aria-hidden="true"><path d="M10 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7m-6 7c0-3.3 2.7-5 6-5s6 1.7 6 5z" /></svg>
	<span class="truncate">{name}</span>
</span>
