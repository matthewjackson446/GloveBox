<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import Logo from '$lib/components/Logo.svelte';

	let { data, children } = $props();

	const links = [
		{ href: '/', label: 'Dashboard', match: (p: string) => p === '/' || p.startsWith('/vehicles') },
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
			<nav class="flex gap-1 text-sm">
				{#each links as link}
					<a
						href={link.href}
						class="rounded-lg px-3 py-1.5 font-medium transition {link.match(page.url.pathname)
							? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
							: 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'}"
						aria-current={link.match(page.url.pathname) ? 'page' : undefined}>{link.label}</a
					>
				{/each}
			</nav>
			<div class="ml-auto flex items-center gap-3">
				<span class="hidden text-sm text-zinc-500 sm:inline dark:text-zinc-400">{data.user.name}</span>
				<form method="POST" action="/logout">
					<button class="btn-ghost px-3 py-1.5">Sign out</button>
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
