<script lang="ts">
	let {
		registration,
		size = 'md',
		rear = true
	}: { registration: string; size?: 'sm' | 'md' | 'lg'; rear?: boolean } = $props();

	const sizes = {
		sm: 'text-xs px-1.5 py-0.5 rounded',
		md: 'text-sm px-2 py-0.5 rounded-md',
		lg: 'text-2xl px-3 py-1 rounded-lg'
	};
</script>

<!-- UK-style number plate: yellow rear / white front. -->
<span
	class="inline-block border border-black/20 font-plate font-black tracking-wider whitespace-nowrap text-black uppercase shadow-sm {sizes[
		size
	]} {rear ? 'bg-[#f7c600]' : 'bg-white'}">{registration}</span
>
