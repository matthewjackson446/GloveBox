<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatDate } from '$lib/format';

	let { data, form } = $props();

	const v = (k: string, fallback: string | number) => form?.save?.values?.[k] ?? String(fallback);
	const hours = Array.from({ length: 24 }, (_, h) => h);
	let busy = $state<string | null>(null);

	const track = (name: string) => () => {
		busy = name;
		return async ({ update }: { update: (o?: { reset?: boolean }) => Promise<void> }) => {
			await update({ reset: false });
			busy = null;
		};
	};
</script>

<svelte:head><title>Server settings · Glovebox</title></svelte:head>

<a href="/settings" class="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">← Settings</a>
<h1 class="mt-2 text-2xl font-semibold tracking-tight">Server settings</h1>
<p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">These apply to everyone using this Glovebox. Users choose their own reminder times and channels in Settings.</p>

<form method="POST" action="?/save" use:enhance={track('save')} class="mt-8 space-y-6">
	{#if form?.save?.error}<p class="alert-error">{form.save.error}</p>{/if}
	{#if form?.save?.success}<p class="alert-success">{form.save.success}</p>{/if}

	<section class="card p-6">
		<h2 class="font-semibold">Reminders</h2>
		<div class="mt-4 grid gap-4 sm:grid-cols-2">
			<div>
				<label class="label" for="reminder_hour">Send reminders daily at</label>
				<select class="input" id="reminder_hour" name="reminder_hour" value={v('reminder_hour', data.reminderHour)}>
					{#each hours as h}<option value={String(h)}>{String(h).padStart(2, '0')}:00</option>{/each}
				</select>
				<p class="mt-1.5 text-xs text-zinc-500">
					Timezone: {data.timezone} (set with the container’s <code>TZ</code> variable).
					{#if data.lastRun}Last run {formatDate(data.lastRun)}.{:else}Hasn’t run yet.{/if}
				</p>
			</div>
			<div>
				<label class="label" for="public_url">Public URL <span class="font-normal text-zinc-400">(optional)</span></label>
				<input class="input" id="public_url" name="public_url" inputmode="url" placeholder="https://glovebox.example.com" value={v('public_url', data.publicUrl)} />
				<p class="mt-1.5 text-xs text-zinc-500">Adds an “Open Glovebox” link to notifications.</p>
			</div>
		</div>
	</section>

	<section class="card p-6">
		<div class="flex items-center justify-between gap-4">
			<h2 class="font-semibold">Email (SMTP)</h2>
			<span class="text-xs font-medium {data.emailConfigured ? 'text-emerald-700 dark:text-emerald-400' : 'text-zinc-500'}">
				{data.emailConfigured ? '● Configured' : '○ Not set up'}
			</span>
		</div>
		<p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
			Needed only for email reminders. With Gmail, use <code>smtp.gmail.com</code>, port 587, STARTTLS, and an app password.
		</p>
		<div class="mt-4 grid gap-4 sm:grid-cols-6">
			<div class="sm:col-span-3">
				<label class="label" for="smtp_host">SMTP server</label>
				<input class="input" id="smtp_host" name="smtp_host" placeholder="smtp.gmail.com" value={v('smtp_host', data.smtp.host)} />
			</div>
			<div class="sm:col-span-1">
				<label class="label" for="smtp_port">Port</label>
				<input class="input" id="smtp_port" name="smtp_port" inputmode="numeric" placeholder="587" value={v('smtp_port', data.smtp.port)} />
			</div>
			<div class="sm:col-span-2">
				<label class="label" for="smtp_security">Security</label>
				<select class="input" id="smtp_security" name="smtp_security" value={v('smtp_security', data.smtp.security)}>
					<option value="starttls">STARTTLS (587)</option>
					<option value="tls">TLS (465)</option>
					<option value="none">None (local relay)</option>
				</select>
			</div>
			<div class="sm:col-span-3">
				<label class="label" for="smtp_user">Username</label>
				<input class="input" id="smtp_user" name="smtp_user" autocomplete="off" value={v('smtp_user', data.smtp.user)} />
			</div>
			<div class="sm:col-span-3">
				<label class="label" for="smtp_pass">Password</label>
				<input class="input" id="smtp_pass" name="smtp_pass" type="password" autocomplete="new-password" placeholder={data.smtp.hasPassword ? '•••••••• (saved, leave blank to keep)' : ''} />
				{#if data.smtp.hasPassword}
					<label class="mt-1.5 flex items-center gap-2 text-xs text-zinc-500"><input type="checkbox" name="clear_pass" class="accent-emerald-600" /> Remove saved password</label>
				{/if}
			</div>
			<div class="sm:col-span-6">
				<label class="label" for="smtp_from">From address</label>
				<input class="input" id="smtp_from" name="smtp_from" placeholder="Glovebox <glovebox@example.com>" value={v('smtp_from', data.smtp.from)} />
			</div>
		</div>
	</section>

	<button class="btn-primary" disabled={busy === 'save'}>{busy === 'save' ? 'Saving…' : 'Save server settings'}</button>
</form>

<section class="card mt-8 p-6">
	<h2 class="font-semibold">Check it works</h2>
	<div class="mt-4 flex flex-wrap gap-3">
		<form method="POST" action="?/testEmail" use:enhance={track('test')}>
			<button class="btn-secondary" disabled={!data.emailConfigured || busy === 'test'}>{busy === 'test' ? 'Sending…' : `Send test email to ${data.user?.email}`}</button>
		</form>
		<form method="POST" action="?/runNow" use:enhance={track('run')}>
			<button class="btn-secondary" disabled={busy === 'run'}>{busy === 'run' ? 'Running…' : 'Send due reminders now'}</button>
		</form>
	</div>
	<p class="mt-2 text-xs text-zinc-500">“Send due reminders now” runs the normal daily check straight away. Anything already sent won’t be sent again.</p>
	{#if form?.test?.error}<p class="alert-error mt-4">{form.test.error}</p>{/if}
	{#if form?.test?.success}<p class="alert-success mt-4">{form.test.success}</p>{/if}
	{#if form?.run?.error}<p class="alert-error mt-4">{form.run.error}</p>{/if}
	{#if form?.run?.success}<p class="alert-success mt-4">{form.run.success}</p>{/if}
</section>
