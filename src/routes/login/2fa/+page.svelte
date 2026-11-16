<script lang="ts">
	import { enhance } from '$app/forms';
	import AuthShell from '$lib/components/AuthShell.svelte';

	let { form } = $props();
	let busy = $state(false);
	let useRecovery = $state(false);
</script>

<svelte:head><title>Two-factor code · Glovebox</title></svelte:head>

<AuthShell title="Enter your code" subtitle={useRecovery ? 'Type one of the recovery codes you saved when you set up two-factor sign-in.' : 'Open your authenticator app and enter the 6-digit code for Glovebox.'}>
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
			<label class="label" for="code">{useRecovery ? 'Recovery code' : 'Code'}</label>
			{#if useRecovery}
				<!-- svelte-ignore a11y_autofocus -->
				<input class="input font-mono tracking-wider" id="code" name="code" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="xxxx-xxxx" required autofocus />
			{:else}
				<!-- svelte-ignore a11y_autofocus -->
				<input class="input text-center font-mono text-2xl tracking-[0.4em]" id="code" name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9 ]*" maxlength="7" placeholder="000000" required autofocus />
			{/if}
		</div>
		<button class="btn-primary w-full" disabled={busy}>{busy ? 'Checking…' : 'Sign in'}</button>
	</form>
	<div class="mt-6 flex justify-between text-xs text-zinc-500">
		<button type="button" class="hover:underline" onclick={() => (useRecovery = !useRecovery)}>
			{useRecovery ? 'Use authenticator code' : 'Lost your phone? Use a recovery code'}
		</button>
		<a href="/login" class="hover:underline">Start again</a>
	</div>
</AuthShell>
