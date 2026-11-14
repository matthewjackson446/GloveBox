<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatDate } from '$lib/format';
	import KeyGuide from '$lib/components/KeyGuide.svelte';
	import { DVLA_GUIDE, DVSA_GUIDE } from '$lib/lookupGuide';

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

{#snippet saveRow(service: string, label: string)}
	<div class="mt-5 flex flex-wrap items-center gap-3">
		<button class="btn-primary" disabled={busy === service}>{busy === service ? 'Saving…' : label}</button>
		{#if form?.lookupsService === service && form?.lookups?.error}<p class="text-sm text-red-600 dark:text-red-400">{form.lookups.error}</p>{/if}
		{#if form?.lookupsService === service && form?.lookups?.success}<p class="text-sm text-emerald-700 dark:text-emerald-400">✓ {form.lookups.success}</p>{/if}
	</div>
{/snippet}

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
		{#if data.smtpEnv}
			<p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
				Set by the container’s <code>SMTP_*</code> variables (e.g. in the Unraid template), so it can’t be changed here. Edit the container to change it.
			</p>
			{#if !data.smtpEnv.complete}
				<p class="alert-error mt-3"><code>SMTP_HOST</code> is set but <code>SMTP_FROM</code> isn’t, so email is off. Add <code>SMTP_FROM</code> to the container.</p>
			{/if}
			<dl class="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
				<dt class="text-zinc-500">Server</dt><dd class="font-mono">{data.smtpEnv.host}:{data.smtpEnv.port} · {data.smtpEnv.security.toUpperCase()}</dd>
				<dt class="text-zinc-500">Username</dt><dd class="font-mono">{data.smtpEnv.user || '—'}</dd>
				<dt class="text-zinc-500">Password</dt><dd>{data.smtpEnv.hasPassword ? 'Set' : 'Not set'}</dd>
				<dt class="text-zinc-500">From</dt><dd class="font-mono">{data.smtpEnv.from || '—'}</dd>
			</dl>
		{:else}
		<p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
			Needed only for email reminders. With Gmail, use <code>smtp.gmail.com</code>, port 587, STARTTLS, and an app password.
			On Unraid you can set these in the container template instead (<code>SMTP_HOST</code>, <code>SMTP_PASS</code>…).
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
				<input class="input" id="smtp_user" name="smtp_user" autocomplete="off" data-1p-ignore data-lpignore="true" data-bwignore spellcheck="false" value={v('smtp_user', data.smtp.user)} />
			</div>
			<div class="sm:col-span-3">
				<label class="label" for="smtp_pass">Password</label>
				<input class="input" id="smtp_pass" name="smtp_pass" type="password" autocomplete="new-password" data-1p-ignore data-lpignore="true" data-bwignore placeholder={data.smtp.hasPassword ? '•••••••• (saved, leave blank to keep)' : ''} />
				{#if data.smtp.hasPassword}
					<label class="mt-1.5 flex items-center gap-2 text-xs text-zinc-500"><input type="checkbox" name="clear_pass" class="accent-emerald-600" /> Remove saved password</label>
				{/if}
			</div>
			<div class="sm:col-span-6">
				<label class="label" for="smtp_from">From address</label>
				<input class="input" id="smtp_from" name="smtp_from" placeholder="Glovebox <glovebox@example.com>" value={v('smtp_from', data.smtp.from)} />
			</div>
		</div>
		{/if}
	</section>

	<button class="btn-primary" disabled={busy === 'save'}>{busy === 'save' ? 'Saving…' : 'Save server settings'}</button>
</form>

<section class="mt-10" id="lookups">
	<h2 class="text-lg font-semibold tracking-tight">Vehicle lookups <span class="text-sm font-normal text-zinc-500">(optional)</span></h2>
	<p class="mt-1 max-w-3xl text-sm text-zinc-500 dark:text-zinc-400">
		With these, typing a registration fills in the vehicle’s details, and Glovebox keeps tax and MOT dates up to date by itself every night.
		Both are free, but Glovebox doesn’t come with keys: each install uses keys issued to whoever runs it. Without them, everything still works with dates entered by hand.
	</p>

	<div class="mt-4 space-y-6">
		<form method="POST" action="?/saveLookups" use:enhance={track('dvla')} class="card p-6">
			<input type="hidden" name="service" value="dvla" />
			<div class="flex items-center justify-between gap-4">
				<h3 class="font-semibold">{DVLA_GUIDE.title}</h3>
				<span class="text-xs font-medium {data.lookups.dvla.configured ? 'text-emerald-700 dark:text-emerald-400' : 'text-zinc-500'}">{data.lookups.dvla.configured ? '● Connected' : '○ Not set up'}</span>
			</div>
			<p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{DVLA_GUIDE.gives}</p>
			<KeyGuide guide={DVLA_GUIDE} open={!data.lookups.dvla.configured} />
			<div class="mt-4">
				<label class="label" for="dvla_api_key">API key</label>
				<input class="input font-mono" id="dvla_api_key" name="dvla_api_key" type="password" autocomplete="off" placeholder={data.lookups.dvla.configured ? '•••••••• (saved, leave blank to keep)' : 'Paste the key from DVLA’s email'} />
				{#if data.lookups.dvla.configured}
					<label class="mt-1.5 flex items-center gap-2 text-xs text-zinc-500"><input type="checkbox" name="clear_dvla_api_key" class="accent-emerald-600" /> Remove saved key</label>
				{/if}
			</div>
			{@render saveRow('dvla', 'Save DVLA key')}
		</form>

		<form method="POST" action="?/saveLookups" use:enhance={track('dvsa')} class="card p-6">
			<input type="hidden" name="service" value="dvsa" />
			<div class="flex items-center justify-between gap-4">
				<h3 class="font-semibold">{DVSA_GUIDE.title}</h3>
				<span class="text-xs font-medium {data.lookups.dvsa.configured ? 'text-emerald-700 dark:text-emerald-400' : 'text-zinc-500'}">{data.lookups.dvsa.configured ? '● Connected' : '○ Not set up'}</span>
			</div>
			<p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{DVSA_GUIDE.gives}</p>
			<KeyGuide guide={DVSA_GUIDE} open={!data.lookups.dvsa.configured} />
			<div class="mt-4 grid gap-4 sm:grid-cols-2">
				<div>
					<label class="label" for="dvsa_client_id">Client ID</label>
					<input class="input font-mono" id="dvsa_client_id" name="dvsa_client_id" autocomplete="off" value={data.lookups.dvsa.clientId} />
				</div>
				<div>
					<label class="label" for="dvsa_client_secret">Client secret</label>
					<input class="input font-mono" id="dvsa_client_secret" name="dvsa_client_secret" type="password" autocomplete="off" placeholder={data.lookups.dvsa.hasSecret ? '•••••••• (saved, leave blank to keep)' : ''} />
					{#if data.lookups.dvsa.hasSecret}<label class="mt-1.5 flex items-center gap-2 text-xs text-zinc-500"><input type="checkbox" name="clear_dvsa_client_secret" class="accent-emerald-600" /> Remove</label>{/if}
				</div>
				<div>
					<label class="label" for="dvsa_api_key">API key</label>
					<input class="input font-mono" id="dvsa_api_key" name="dvsa_api_key" type="password" autocomplete="off" placeholder={data.lookups.dvsa.hasApiKey ? '•••••••• (saved, leave blank to keep)' : ''} />
					{#if data.lookups.dvsa.hasApiKey}<label class="mt-1.5 flex items-center gap-2 text-xs text-zinc-500"><input type="checkbox" name="clear_dvsa_api_key" class="accent-emerald-600" /> Remove</label>{/if}
				</div>
				<div>
					<label class="label" for="dvsa_scope">Scope URL</label>
					<input class="input font-mono" id="dvsa_scope" name="dvsa_scope" value={data.lookups.dvsa.scope} />
				</div>
				<div class="sm:col-span-2">
					<label class="label" for="dvsa_token_url">Token URL</label>
					<input class="input font-mono" id="dvsa_token_url" name="dvsa_token_url" inputmode="url" placeholder="https://login.microsoftonline.com/…/oauth2/v2.0/token" value={data.lookups.dvsa.tokenUrl} />
					<p class="mt-1.5 text-xs text-zinc-500">Copy it exactly from DVSA’s email.</p>
				</div>
			</div>
			{@render saveRow('dvsa', 'Save DVSA details')}
		</form>
	</div>

	{#if data.lookups.dvla.configured || data.lookups.dvsa.configured}
		<div class="card mt-6 p-6">
			<h3 class="font-semibold">Test a lookup</h3>
			<form method="POST" action="?/testLookup" use:enhance={track('test-lookup')} class="mt-3 flex flex-wrap items-end gap-2">
				<div>
					<label class="label" for="test-reg">Registration</label>
					<input class="input w-40 font-semibold uppercase" id="test-reg" name="reg" value={data.lookups.testReg} placeholder="AB12 CDE" />
				</div>
				{#if data.lookups.dvla.configured}
					<button class="btn-secondary" name="service" value="dvla" disabled={busy === 'test-lookup'}>Test DVLA</button>
				{/if}
				{#if data.lookups.dvsa.configured}
					<button class="btn-secondary" name="service" value="dvsa" disabled={busy === 'test-lookup'}>Test DVSA</button>
				{/if}
				{#if busy === 'test-lookup'}<span class="pb-2 text-sm text-zinc-500">Testing…</span>{/if}
			</form>
			{#if form?.lookupTest?.error}<p class="alert-error mt-4">{form.lookupTest.error}</p>{/if}
			{#if form?.lookupTest?.success}<p class="alert-success mt-4">{form.lookupTest.success}</p>{/if}
		</div>
	{/if}
</section>

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
