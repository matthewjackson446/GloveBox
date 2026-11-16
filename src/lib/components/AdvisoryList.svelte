<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatDate, formatTimestamp } from '$lib/format';
	import type { MotAdvisory } from '$lib/types';

	let {
		advisories,
		canEdit,
		hasMotHistory,
		error = null
	}: { advisories: MotAdvisory[]; canEdit: boolean; hasMotHistory: boolean; error?: string | null } = $props();

	const open = $derived(advisories.filter((a) => a.status === 'open'));
	const resolved = $derived(advisories.filter((a) => a.status !== 'open'));
	const latestTest = $derived(open.find((a) => a.tested_on)?.tested_on ?? null);

	let adding = $state(false);
	let showResolved = $state(false);

	const repeatText = (n: number) => (n === 1 ? 'Also advised at the MOT before' : `Also advised at ${n} earlier MOTs`);
	const resolvedText = (a: MotAdvisory) =>
		`${a.status === 'fixed' ? 'Fixed' : 'Ignored'}${a.resolved_at ? ` ${formatDate(a.resolved_at)}` : ''}`;
</script>

<div class="flex flex-wrap items-end justify-between gap-3">
	<div>
		<h2 class="section-title">MOT advisories</h2>
		<p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
			{#if open.length}
				{open.length} to sort before the next MOT{#if latestTest}{' · '}from the test on {formatDate(latestTest)}{/if}
			{:else if advisories.length}
				Nothing outstanding.
			{:else if hasMotHistory}
				The last MOT had no advisories.
			{:else}
				Keep track of anything the tester advised, and tick it off once it’s done.
			{/if}
		</p>
	</div>
	{#if canEdit && !adding}
		<button type="button" class="btn-ghost px-3 py-1.5" onclick={() => (adding = true)}>+ Add advisory</button>
	{/if}
</div>

{#if error}<p class="alert-error mt-3">{error}</p>{/if}

{#if adding}
	<form
		method="POST"
		action="?/addAdvisory"
		class="mt-3 flex flex-wrap gap-2"
		use:enhance={() =>
			async ({ result, update }) => {
				await update();
				if (result.type === 'success') adding = false;
			}}
	>
		<!-- svelte-ignore a11y_autofocus -->
		<input
			name="text"
			class="input min-w-0 flex-1"
			maxlength="300"
			required
			autofocus
			placeholder="e.g. Nearside front tyre worn close to legal limit"
			aria-label="Advisory"
		/>
		<button class="btn-primary">Add</button>
		<button type="button" class="btn-ghost" onclick={() => (adding = false)}>Cancel</button>
	</form>
{/if}

{#if open.length}
	<ul class="card mt-3 divide-y divide-zinc-100 dark:divide-zinc-800">
		{#each open as a (a.id)}
			<li class="flex flex-wrap items-start gap-x-3 gap-y-2 px-5 py-3">
				<span class="mt-0.5 h-fit shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase {a.severity === 'minor' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'}">
					{a.severity === 'minor' ? 'Minor' : a.test_number ? 'Advisory' : 'Added'}
				</span>
				<div class="min-w-0 flex-1 basis-60">
					<p class="text-sm">{a.text}</p>
					{#if a.seen_before > 0}
						<p class="mt-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">{repeatText(a.seen_before)}</p>
					{:else if !a.test_number}
						<p class="mt-0.5 text-xs text-zinc-500">Added {formatTimestamp(a.created_at)}</p>
					{/if}
				</div>
				{#if canEdit}
					<form method="POST" action="?/advisoryStatus" use:enhance class="-my-1 -mr-2 flex shrink-0">
						<input type="hidden" name="id" value={a.id} />
						<button name="status" value="fixed" class="btn-ghost px-3 py-1.5 text-emerald-700 dark:text-emerald-400">Fixed</button>
						<button name="status" value="dismissed" class="btn-ghost px-3 py-1.5">Ignore</button>
					</form>
				{/if}
			</li>
		{/each}
	</ul>
{/if}

{#if resolved.length}
	<button type="button" class="mt-2 text-sm text-emerald-700 hover:underline dark:text-emerald-400" onclick={() => (showResolved = !showResolved)}>
		{showResolved ? 'Hide' : 'Show'} {resolved.length} fixed or ignored
	</button>
	{#if showResolved}
		<ul class="card mt-2 divide-y divide-zinc-100 dark:divide-zinc-800">
			{#each resolved as a (a.id)}
				<li class="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2.5 text-sm">
					<span class="min-w-0 flex-1 basis-60 text-zinc-500 line-through decoration-zinc-300 dark:text-zinc-400 dark:decoration-zinc-600">{a.text}</span>
					<span class="text-xs text-zinc-500">{resolvedText(a)}</span>
					{#if canEdit}
						<div class="-my-1 -mr-2 flex shrink-0">
							<form method="POST" action="?/advisoryStatus" use:enhance>
								<input type="hidden" name="id" value={a.id} />
								<button name="status" value="open" class="btn-ghost px-3 py-1.5">Reopen</button>
							</form>
							{#if !a.test_number}
								<form method="POST" action="?/deleteAdvisory" use:enhance>
									<input type="hidden" name="id" value={a.id} />
									<button class="btn-ghost px-3 py-1.5 text-red-700 dark:text-red-400">Delete</button>
								</form>
							{/if}
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
{/if}
