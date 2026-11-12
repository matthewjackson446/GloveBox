<script lang="ts">
	import type { Status } from '$lib/status';

	let { status, class: className = '' }: { status: Status; class?: string } = $props();

	const colours: Record<Status, string> = {
		overdue: 'bg-red-500',
		soon: 'bg-amber-400',
		ok: 'bg-emerald-500',
		none: 'bg-zinc-300 dark:bg-zinc-600'
	};
	const labels: Record<Status, string> = {
		overdue: 'Overdue',
		soon: 'Due soon',
		ok: 'OK',
		none: 'No date set'
	};
</script>

<span class="inline-block size-2.5 shrink-0 rounded-full {colours[status]} {className}" title={labels[status]}>
	<span class="sr-only">{labels[status]}</span>
</span>
