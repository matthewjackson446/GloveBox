<script lang="ts">
	import { formatDate } from '$lib/format';
	import type { IntervalProgress } from '$lib/progress';
	import type { Status } from '$lib/status';

	let {
		progress,
		status,
		class: className = ''
	}: { progress: IntervalProgress; status: Status; class?: string } = $props();

	const fill: Record<Status, string> = {
		overdue: 'bg-red-500',
		soon: 'bg-amber-400',
		ok: 'bg-emerald-500',
		none: 'bg-zinc-400'
	};
	const pct = $derived(Math.round(progress.fraction * 100));
	const label = $derived(
		`${pct}% of the way through, by ${progress.basis === 'miles' ? 'mileage' : 'date'}, since ${formatDate(progress.from)}`
	);
</script>

<div
	class="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800 {className}"
	role="progressbar"
	aria-valuemin="0"
	aria-valuemax="100"
	aria-valuenow={pct}
	aria-label={label}
	title={label}
>
	<div class="h-full rounded-full {fill[status]}" style="width: {Math.max(pct, 2)}%"></div>
</div>
