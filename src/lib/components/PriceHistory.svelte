<script lang="ts">
	import { formatDate, formatMoney } from '$lib/format';
	import type { DueItem, ItemHistory } from '$lib/types';

	let { item, history }: { item: DueItem; history: ItemHistory[] } = $props();

	/** Current period first, then past ones; each compared with the one before it. */
	const rows = $derived(
		[
			{ current: true, provider: item.provider, start_date: item.start_date, due_date: item.due_date, cost: item.cost },
			...history.map((h) => ({ current: false, provider: h.provider, start_date: h.start_date, due_date: h.due_date, cost: h.cost }))
		].map((r, i, all) => {
			const prev = all[i + 1]?.cost;
			const change = r.cost != null && prev != null && prev > 0 ? { amount: r.cost - prev, pct: Math.round(((r.cost - prev) / prev) * 100) } : null;
			return { ...r, change };
		})
	);
</script>

<div class="card overflow-x-auto">
	<table class="w-full text-sm">
		<thead class="text-left text-xs text-zinc-500">
			<tr class="border-b border-zinc-100 dark:border-zinc-800">
				<th class="px-4 py-2 font-medium">Period</th>
				<th class="px-4 py-2 font-medium">Provider</th>
				<th class="px-4 py-2 text-right font-medium">Cost</th>
				<th class="px-4 py-2 text-right font-medium">Change</th>
			</tr>
		</thead>
		<tbody>
			{#each rows as r}
				<tr class="border-b border-zinc-100 last:border-0 dark:border-zinc-800">
					<td class="px-4 py-2 whitespace-nowrap">
						{r.start_date ? formatDate(r.start_date) : '…'} – {formatDate(r.due_date)}
						{#if r.current}<span class="ml-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 uppercase dark:bg-emerald-950 dark:text-emerald-300">Current</span>{/if}
					</td>
					<td class="px-4 py-2">{r.provider ?? '—'}</td>
					<td class="px-4 py-2 text-right tabular-nums">{formatMoney(r.cost)}</td>
					<td class="px-4 py-2 text-right whitespace-nowrap tabular-nums">
						{#if r.change}
							<span class={r.change.amount > 0 ? 'text-red-600 dark:text-red-400' : r.change.amount < 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-zinc-500'}>
								{r.change.amount > 0 ? '+' : r.change.amount < 0 ? '−' : ''}{formatMoney(Math.abs(r.change.amount))} ({r.change.pct > 0 ? '+' : ''}{r.change.pct}%)
							</span>
						{:else}<span class="text-zinc-400">—</span>{/if}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
