<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head><title>{page.status} · Glovebox</title></svelte:head>

<div class="mx-auto max-w-md py-24 text-center">
	<p class="text-5xl font-bold text-zinc-300 dark:text-zinc-700">{page.status}</p>
	<h1 class="mt-4 text-xl font-semibold">{page.error?.message ?? 'Something went wrong'}</h1>
	<a href="/" class="btn-secondary mt-8">Back to dashboard</a>
</div>
