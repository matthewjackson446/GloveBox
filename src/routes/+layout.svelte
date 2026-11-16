<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import Logo from '$lib/components/Logo.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';

	let { data, children } = $props();

	// While signed in and online, have the service worker save every emergency card
	// for when there's no signal. It skips this if it did it in the last few minutes.
	onMount(() => {
		if (!data.user || !('serviceWorker' in navigator)) return;
		navigator.serviceWorker.ready
			.then((reg) => reg.active?.postMessage({ type: 'sync-emergency' }))
			.catch(() => {});
	});

	const links = [
		{ href: '/', label: 'Dashboard', match: (p: string) => p === '/' || p.startsWith('/vehicles') },
		{ href: '/costs', label: 'Costs', match: (p: string) => p.startsWith('/costs') },
		{ href: '/settings', label: 'Settings', match: (p: string) => p.startsWith('/settings') }
	];
</script>

{#if data.user}
	<header
		class="sticky top-0 z-20 border-b border-zinc-200/80 bg-white/80 backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-950/80"
	>
		<div class="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4 sm:gap-6">
			<a href="/" class="flex items-center gap-2 font-semibold tracking-tight">
				<Logo class="size-7" />
				<span class="hidden sm:inline">Glovebox</span>
			</a>
			<nav class="flex gap-0.5 text-sm sm:gap-1">
				{#each links as link}
					<a
						href={link.href}
						class="rounded-lg px-2 py-1.5 font-medium sm:px-3 transition {link.match(page.url.pathname)
							? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
							: 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'}"
						aria-current={link.match(page.url.pathname) ? 'page' : undefined}>{link.label}</a
					>
				{/each}
			</nav>
			<div class="ml-auto flex items-center gap-1 sm:gap-3">
				<ThemeToggle />
				<span class="hidden text-sm text-zinc-500 sm:inline dark:text-zinc-400">{data.user.name}</span>
				<form method="POST" action="/logout">
					<button class="btn-ghost px-2 py-1.5 sm:px-3" title="Sign out">
						<svg viewBox="0 0 20 20" class="size-4 sm:hidden" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M8 4H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3M13 13.5 16.5 10 13 6.5M16.5 10H8" stroke-linecap="round" stroke-linejoin="round" /></svg>
						<span class="sr-only sm:not-sr-only">Sign out</span>
					</button>
				</form>
			</div>
		</div>
	</header>
	<main class="mx-auto max-w-5xl px-4 py-6 sm:py-10">
		{@render children()}
	</main>
{:else}
	{@render children()}
{/if}
