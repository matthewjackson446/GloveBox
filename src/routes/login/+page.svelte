<script lang="ts">
	import { enhance } from '$app/forms';
	import AuthShell from '$lib/components/AuthShell.svelte';

	let { form } = $props();
	let busy = $state(false);
</script>

<svelte:head><title>Sign in · Glovebox</title></svelte:head>

<AuthShell title="Sign in" subtitle="Your vehicles, renewals and paperwork in one place.">
	<form
		method="POST"
		class="space-y-4"
		use:enhance={() => {
			busy = true;
			return async ({ update }) => {
				await update({ reset: false });
				busy = false;
			};
		}}
	>
		{#if form?.error}<p class="alert-error" role="alert">{form.error}</p>{/if}
		<div>
			<label class="label" for="email">Email</label>
			<!-- svelte-ignore a11y_autofocus -->
			<input class="input" id="email" name="email" type="email" autocomplete="username" required autofocus value={form?.email ?? ''} />
		</div>
		<div>
			<label class="label" for="password">Password</label>
			<input class="input" id="password" name="password" type="password" autocomplete="current-password" required />
		</div>
		<button class="btn-primary w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
	</form>
	<p class="mt-6 text-center text-xs text-zinc-500">Forgotten your password? Ask your Glovebox admin to reset it.</p>
</AuthShell>
