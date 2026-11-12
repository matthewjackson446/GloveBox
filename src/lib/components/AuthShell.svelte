<script lang="ts">
	import type { Snippet } from 'svelte';
	import Logo from './Logo.svelte';

	let { title, subtitle, children }: { title: string; subtitle?: string; children: Snippet } = $props();
</script>

<div class="flex min-h-dvh items-center justify-center px-4 py-12">
	<div class="w-full max-w-sm">
		<div class="mb-8 flex flex-col items-center text-center">
			<Logo class="size-12" />
			<h1 class="mt-5 text-2xl font-semibold tracking-tight">{title}</h1>
			{#if subtitle}<p class="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>{/if}
		</div>
		<div class="card p-6">
			{@render children()}
		</div>
	</div>
</div>
