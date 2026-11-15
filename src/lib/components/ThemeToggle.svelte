<script lang="ts">
	import { onMount } from 'svelte';

	type Pref = 'system' | 'light' | 'dark';
	const KEY = 'glovebox-theme';
	const ORDER: Pref[] = ['system', 'light', 'dark'];
	const LABELS: Record<Pref, string> = { system: 'Theme: match device', light: 'Theme: light', dark: 'Theme: dark' };

	let pref = $state<Pref>('system');

	function apply(p: Pref) {
		const dark = p === 'dark' || (p === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
		document.documentElement.dataset.theme = dark ? 'dark' : 'light';
		document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
	}

	onMount(() => {
		try {
			const saved = localStorage.getItem(KEY) as Pref | null;
			if (saved && ORDER.includes(saved)) pref = saved;
		} catch {
			/* storage unavailable: stay on system */
		}
		// Follow the device when it switches (e.g. at sunset) while on "system".
		const mq = matchMedia('(prefers-color-scheme: dark)');
		const onChange = () => pref === 'system' && apply('system');
		mq.addEventListener('change', onChange);
		return () => mq.removeEventListener('change', onChange);
	});

	function cycle() {
		pref = ORDER[(ORDER.indexOf(pref) + 1) % ORDER.length];
		try {
			localStorage.setItem(KEY, pref);
		} catch {
			/* ignore */
		}
		apply(pref);
	}
</script>

<button type="button" class="btn-ghost px-2 py-1.5" onclick={cycle} title={LABELS[pref]} aria-label={`${LABELS[pref]} (click to change)`}>
	{#if pref === 'light'}
		<svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
	{:else if pref === 'dark'}
		<svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></svg>
	{:else}
		<svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></svg>
	{/if}
</button>
