<script lang="ts">
	import { onMount } from 'svelte';
	import { formatTimestamp } from '$lib/format';

	let { class: className = '' }: { class?: string } = $props();

	/** null until checked in the browser. */
	let status = $state<{ tone: 'ok' | 'warn' | 'muted'; text: string } | null>(null);

	onMount(async () => {
		if (!window.isSecureContext || !('serviceWorker' in navigator)) {
			status = { tone: 'muted', text: 'To keep this card on your phone for when there’s no signal, open Glovebox over HTTPS.' };
			return;
		}
		try {
			const saved = await caches.match(location.pathname, { cacheName: 'glovebox-emergency' });
			if (!navigator.onLine) {
				const at = saved?.headers.get('date');
				status = { tone: 'warn', text: `You’re offline. This is the copy saved on this device${at ? ` ${formatTimestamp(new Date(at).toISOString())}` : ''}.` };
			} else if (saved) {
				status = { tone: 'ok', text: 'Saved on this device, so it opens even with no signal.' };
			} else {
				status = { tone: 'muted', text: 'This card will be saved on this device for when there’s no signal.' };
			}
		} catch {
			status = null;
		}
	});

	const tones = {
		ok: 'text-emerald-700 dark:text-emerald-400',
		warn: 'text-amber-700 dark:text-amber-400',
		muted: 'text-zinc-500 dark:text-zinc-400'
	};
</script>

{#if status}
	<p class="flex items-center gap-2 text-xs {tones[status.tone]} {className}">
		<svg viewBox="0 0 20 20" class="size-4 shrink-0" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
			<path d="M3 7.5a10.5 10.5 0 0 1 14 0M5.5 10.3a7 7 0 0 1 9 0M8 13a3.5 3.5 0 0 1 4 0" stroke-linecap="round" />
			<circle cx="10" cy="15.5" r="0.9" fill="currentColor" stroke="none" />
		</svg>
		{status.text}
	</p>
{/if}
