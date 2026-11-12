<script lang="ts">
	let { class: className = '' }: { class?: string } = $props();
</script>

<!-- A glovebox: a rounded compartment with a latch. -->
<svg viewBox="0 0 32 32" class={className} aria-hidden="true">
	<rect x="1" y="1" width="30" height="30" rx="8" class="fill-emerald-600 dark:fill-emerald-500" />
	<path d="M7 11.5c0-1.4 1.1-2.5 2.5-2.5h13c1.4 0 2.5 1.1 2.5 2.5V21c0 1.1-.9 2-2 2H9c-1.1 0-2-.9-2-2z" fill="white" fill-opacity="0.95" />
	<path d="M7 14h18" stroke="currentColor" stroke-width="1.6" class="text-emerald-600 dark:text-emerald-500" />
	<rect x="13" y="16.5" width="6" height="2.4" rx="1.2" class="fill-emerald-600 dark:fill-emerald-500" />
</svg>
