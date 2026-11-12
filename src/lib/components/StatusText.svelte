<script lang="ts">
	import { describeState, type ItemState } from '$lib/status';

	let { state, class: className = '' }: { state: ItemState; class?: string } = $props();

	const colours = {
		overdue: 'text-red-600 dark:text-red-400',
		soon: 'text-amber-600 dark:text-amber-400',
		ok: 'text-zinc-500 dark:text-zinc-400',
		none: 'text-zinc-400 dark:text-zinc-500'
	};
</script>

<span class="text-sm font-medium {colours[state.status]} {className}">{describeState(state)}</span>
