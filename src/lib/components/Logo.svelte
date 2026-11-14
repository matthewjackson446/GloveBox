<script lang="ts">
	let { class: className = '' }: { class?: string } = $props();
	// Unique, hydration-safe gradient id so several logos on one page don't clash.
	const uid = $props.id();
	const id = `gb-${uid}`;
</script>

<!-- A glovebox with paperwork inside. Same artwork as static/icon.svg. -->
<svg viewBox="16 16 480 480" class={className} aria-hidden="true">
	<defs>
		<linearGradient id="{id}-bg" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="#10b981" />
			<stop offset="1" stop-color="#047857" />
		</linearGradient>
	</defs>
	<rect x="16" y="16" width="480" height="480" rx="120" fill="url(#{id}-bg)" />
	<g transform="rotate(-8 256 170)">
		<rect x="176" y="96" width="150" height="150" rx="14" fill="#fef3c7" />
		<rect x="200" y="128" width="96" height="12" rx="6" fill="#f59e0b" opacity=".75" />
	</g>
	<path d="M112 196c0-22 18-40 40-40h208c22 0 40 18 40 40v156c0 18-14 32-32 32H144c-18 0-32-14-32-32z" fill="#fff" />
	<path d="M112 238h288" stroke="#047857" stroke-width="16" opacity=".9" />
	<rect x="210" y="274" width="92" height="38" rx="19" fill="#047857" />
</svg>
