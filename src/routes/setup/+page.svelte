<script lang="ts">
	import { enhance } from '$app/forms';
	import AuthShell from '$lib/components/AuthShell.svelte';

	let { form } = $props();
	let busy = $state(false);
</script>

<svelte:head><title>Set up · Glovebox</title></svelte:head>

<AuthShell title="Welcome to Glovebox" subtitle="Create the admin account to get started. You can invite other people afterwards.">
	<form
		method="POST"
		class="space-y-4"
		use:enhance={() => {
			busy = true;
			return async ({ update }) => {
				await update();
				busy = false;
			};
		}}
	>
		{#if form?.error}<p class="alert-error" role="alert">{form.error}</p>{/if}
		<div>
			<label class="label" for="name">Your name</label>
			<input class="input" id="name" name="name" autocomplete="name" required value={form?.values?.name ?? ''} />
		</div>
		<div>
			<label class="label" for="email">Email</label>
			<input class="input" id="email" name="email" type="email" autocomplete="email" required value={form?.values?.email ?? ''} />
		</div>
		<div>
			<label class="label" for="password">Password</label>
			<input class="input" id="password" name="password" type="password" autocomplete="new-password" minlength="8" required />
		</div>
		<div>
			<label class="label" for="confirm">Confirm password</label>
			<input class="input" id="confirm" name="confirm" type="password" autocomplete="new-password" minlength="8" required />
		</div>
		<button class="btn-primary w-full" disabled={busy}>{busy ? 'Creating…' : 'Create admin account'}</button>
	</form>
</AuthShell>
