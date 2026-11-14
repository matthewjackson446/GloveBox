<script lang="ts">
	import { enhance } from '$app/forms';
	import { telHref } from '$lib/format';

	let { data, form } = $props();

	const CHANNEL_HELP: Record<string, string> = {
		email: 'Reminder emails to any address.',
		ntfy: 'Push notifications to your phone with the ntfy app. Self-hosted or ntfy.sh.',
		gotify: 'Push notifications via your Gotify server.',
		discord: 'Posts to a Discord channel via a webhook.',
		webhook: 'POSTs JSON {title, message, url, urgent} to any URL. Good for Home Assistant or n8n.'
	};
	let channelType = $state('ntfy');
	// After a failed submit, keep the type the user picked.
	$effect(() => {
		if (form?.channel?.values?.type) channelType = form.channel.values.type;
	});
	const cv = (k: string) => form?.channel?.values?.[k] ?? '';

	const dayLabel = (d: number) => (d === 1 ? '1 day' : d % 7 === 0 && d < 30 ? `${d / 7} week${d === 7 ? '' : 's'}` : `${d} days`);

	function ago(sqlDate: string | null) {
		if (!sqlDate) return null;
		const d = new Date(sqlDate.replace(' ', 'T') + 'Z');
		return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
	}
</script>

<svelte:head><title>Settings · Glovebox</title></svelte:head>

<div class="flex flex-wrap items-end justify-between gap-4">
	<h1 class="text-2xl font-semibold tracking-tight">Settings</h1>
	{#if data.user?.role === 'admin'}
		<div class="flex gap-2">
			<a href="/settings/users" class="btn-secondary">Users</a>
			<a href="/settings/server" class="btn-secondary">Server</a>
		</div>
	{/if}
</div>

<div class="mt-8 grid gap-6 lg:grid-cols-2">
	<section class="card p-6">
		<h2 class="font-semibold">Profile</h2>
		<form method="POST" action="?/profile" use:enhance={() => async ({ update }) => update({ reset: false })} class="mt-4 space-y-4">
			{#if form?.profile?.error}<p class="alert-error">{form.profile.error}</p>{/if}
			{#if form?.profile?.success}<p class="alert-success">{form.profile.success}</p>{/if}
			<div>
				<label class="label" for="name">Name</label>
				<input class="input" id="name" name="name" required value={data.user?.name} />
			</div>
			<div>
				<label class="label" for="email">Email</label>
				<input class="input" id="email" name="email" type="email" required value={data.user?.email} />
				<p class="mt-1.5 text-xs text-zinc-500">Used to sign in, and for reminder emails once those are set up.</p>
			</div>
			<button class="btn-primary">Save profile</button>
		</form>
	</section>

	<section class="card p-6">
		<h2 class="font-semibold">Change password</h2>
		<form method="POST" action="?/password" use:enhance class="mt-4 space-y-4">
			{#if form?.password?.error}<p class="alert-error">{form.password.error}</p>{/if}
			{#if form?.password?.success}<p class="alert-success">{form.password.success}</p>{/if}
			<div>
				<label class="label" for="current">Current password</label>
				<input class="input" id="current" name="current" type="password" autocomplete="current-password" required />
			</div>
			<div class="grid gap-4 sm:grid-cols-2">
				<div>
					<label class="label" for="password">New password</label>
					<input class="input" id="password" name="password" type="password" autocomplete="new-password" minlength="8" required />
				</div>
				<div>
					<label class="label" for="confirm">Confirm</label>
					<input class="input" id="confirm" name="confirm" type="password" autocomplete="new-password" minlength="8" required />
				</div>
			</div>
			<button class="btn-primary">Change password</button>
		</form>
	</section>

	<section class="card p-6 lg:col-span-2" id="reminders">
		<h2 class="font-semibold">Reminders</h2>
		<p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
			Once a day, Glovebox checks everything due on vehicles you have access to and sends one message with anything that needs attention. You won’t get the same reminder twice.
		</p>

		<form method="POST" action="?/reminderPrefs" use:enhance={() => async ({ update }) => update({ reset: false })} class="mt-5 space-y-4">
			{#if form?.reminders?.error}<p class="alert-error">{form.reminders.error}</p>{/if}
			{#if form?.reminders?.success}<p class="alert-success">{form.reminders.success}</p>{/if}
			<label class="flex items-center gap-3">
				<input type="checkbox" name="enabled" checked={data.reminders.enabled} class="size-4 accent-emerald-600" />
				<span class="text-sm font-medium">Send me reminders</span>
			</label>
			<fieldset>
				<legend class="label">Remind me before something is due</legend>
				<div class="flex flex-wrap gap-2">
					{#each data.reminders.choices as d}
						<label class="cursor-pointer">
							<input type="checkbox" name="days" value={d} checked={data.reminders.days.includes(d)} class="peer sr-only" />
							<span class="inline-block rounded-full border border-zinc-300 px-3 py-1 text-sm transition peer-checked:border-emerald-600 peer-checked:bg-emerald-50 peer-checked:text-emerald-800 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500 dark:border-zinc-700 dark:peer-checked:border-emerald-500 dark:peer-checked:bg-emerald-950 dark:peer-checked:text-emerald-300">{dayLabel(d)}</span>
						</label>
					{/each}
				</div>
			</fieldset>
			<label class="flex items-center gap-3">
				<input type="checkbox" name="overdue" checked={data.reminders.overdue} class="size-4 accent-emerald-600" />
				<span class="text-sm">Also tell me when something becomes overdue</span>
			</label>
			<p class="text-xs text-zinc-500">Mileage-based services remind you when they’re within 1,000 miles.</p>
			<button class="btn-primary">Save reminder settings</button>
		</form>

		<div class="mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-800">
			<h3 class="font-semibold">Where to send them</h3>
			{#if form?.channelRow?.error}<p class="alert-error mt-3">{form.channelRow.error}</p>{/if}
			{#if form?.channelRow?.success}<p class="alert-success mt-3">{form.channelRow.success}</p>{/if}

			{#if data.channels.length}
				<ul class="mt-3 divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
					{#each data.channels as c (c.id)}
						<li class="flex flex-wrap items-center gap-x-4 gap-y-2 p-3 {c.enabled ? '' : 'opacity-60'}">
							<span class="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-semibold dark:bg-zinc-800">{c.typeLabel}</span>
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm font-medium">{c.name}</p>
								<p class="truncate text-xs text-zinc-500">
									{c.target}
									{#if c.last_error}<span class="text-red-600 dark:text-red-400"> · Last attempt failed: {c.last_error}</span>
									{:else if c.last_sent_at}<span> · Last sent {ago(c.last_sent_at)}</span>{/if}
								</p>
							</div>
							<form method="POST" action="?/testChannel" use:enhance>
								<input type="hidden" name="id" value={c.id} />
								<button class="btn-ghost px-3 py-1.5">Send test</button>
							</form>
							<form method="POST" action="?/toggleChannel" use:enhance>
								<input type="hidden" name="id" value={c.id} />
								<input type="hidden" name="enabled" value={c.enabled ? 'false' : 'true'} />
								<button class="btn-ghost px-3 py-1.5">{c.enabled ? 'Pause' : 'Resume'}</button>
							</form>
							<form method="POST" action="?/deleteChannel" use:enhance={({ cancel }) => { if (!confirm(`Remove ${c.name}?`)) cancel(); }}>
								<input type="hidden" name="id" value={c.id} />
								<button class="btn-ghost px-3 py-1.5 text-red-600 dark:text-red-400">Remove</button>
							</form>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="mt-2 text-sm text-amber-700 dark:text-amber-400">Add somewhere to send reminders, or you won’t get any.</p>
			{/if}

			<form method="POST" action="?/addChannel" use:enhance class="mt-4 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-950/60">
				{#if form?.channel?.error}<p class="alert-error mb-4">{form.channel.error}</p>{/if}
				{#if form?.channel?.success}<p class="alert-success mb-4">{form.channel.success}</p>{/if}
				<div class="grid gap-4 sm:grid-cols-2">
					<div>
						<label class="label" for="ch-type">Add a channel</label>
						<select class="input" id="ch-type" name="type" bind:value={channelType}>
							<option value="ntfy">ntfy (push)</option>
							<option value="email">Email</option>
							<option value="gotify">Gotify (push)</option>
							<option value="discord">Discord</option>
							<option value="webhook">Webhook</option>
						</select>
						<p class="mt-1.5 text-xs text-zinc-500">{CHANNEL_HELP[channelType]}</p>
					</div>
					<div>
						<label class="label" for="ch-name">Name <span class="font-normal text-zinc-400">(optional)</span></label>
						<input class="input" id="ch-name" name="name" placeholder="e.g. My phone" value={cv('name')} />
					</div>

					{#if channelType === 'email'}
						<div class="sm:col-span-2">
							<label class="label" for="ch-to">Email address</label>
							<input class="input" id="ch-to" name="to" type="email" required value={cv('to') || data.user?.email} />
							{#if !data.emailAvailable}
								<p class="mt-1.5 text-xs text-amber-700 dark:text-amber-400">
									Email isn’t set up on this server yet{data.user?.role === 'admin' ? '. Add SMTP details under Server settings.' : '. Ask your admin to add SMTP details.'}
								</p>
							{/if}
						</div>
					{:else if channelType === 'ntfy'}
						<div>
							<label class="label" for="ch-server">Server</label>
							<input class="input" id="ch-server" name="server" inputmode="url" value={cv('server') || 'https://ntfy.sh'} />
						</div>
						<div>
							<label class="label" for="ch-topic">Topic</label>
							<input class="input" id="ch-topic" name="topic" required pattern="[A-Za-z0-9_\-]+" placeholder="something-hard-to-guess" value={cv('topic')} />
						</div>
						<div class="sm:col-span-2">
							<label class="label" for="ch-token">Access token <span class="font-normal text-zinc-400">(only if your topic is protected)</span></label>
							<input class="input" id="ch-token" name="token" type="password" autocomplete="off" />
							<p class="mt-1.5 text-xs text-zinc-500">On ntfy.sh anyone who knows the topic name can read it, so pick something unguessable.</p>
						</div>
					{:else if channelType === 'gotify'}
						<div>
							<label class="label" for="ch-server">Server URL</label>
							<input class="input" id="ch-server" name="server" inputmode="url" required placeholder="http://tower:8070" value={cv('server')} />
						</div>
						<div>
							<label class="label" for="ch-token">Application token</label>
							<input class="input" id="ch-token" name="token" type="password" autocomplete="off" required />
						</div>
					{:else}
						<div class="sm:col-span-2">
							<label class="label" for="ch-url">{channelType === 'discord' ? 'Discord webhook URL' : 'URL'}</label>
							<input class="input" id="ch-url" name="url" inputmode="url" required placeholder={channelType === 'discord' ? 'https://discord.com/api/webhooks/…' : 'https://…'} />
						</div>
					{/if}
				</div>
				<button class="btn-secondary mt-4">Add channel</button>
			</form>
		</div>
	</section>

	<section class="card p-6 lg:col-span-2" id="calendar">
		<h2 class="font-semibold">Calendar</h2>
		<p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
			Subscribe to every due date (MOT, tax, insurance, services…) in Google, Apple or Outlook Calendar. It updates by itself when dates change.
		</p>
		{#if form?.calendarMsg?.success}<p class="alert-success mt-4">{form.calendarMsg.success}</p>{/if}

		{#if data.calendar.url}
			<div class="mt-4 flex flex-wrap gap-2">
				<input class="input min-w-0 flex-1 font-mono text-xs" readonly value={data.calendar.url} aria-label="Your private calendar link" onfocus={(e) => e.currentTarget.select()} />
				<button type="button" class="btn-secondary" onclick={(e) => { navigator.clipboard?.writeText(data.calendar.url!); e.currentTarget.textContent = 'Copied'; }}>Copy</button>
			</div>
			<p class="mt-2 text-xs text-amber-700 dark:text-amber-400">Keep this link private: anyone with it can see your due dates. If it leaks, create a new one.</p>
			{#if !data.calendar.publicUrlSet}
				<p class="mt-1 text-xs text-zinc-500">This link uses the address you’re browsing on. Google and Outlook fetch calendars from the internet, so they need Glovebox’s public address; an admin can set it under Settings → Server → Public URL.</p>
			{/if}

			<details class="mt-4 rounded-xl bg-zinc-50 text-sm dark:bg-zinc-950/60">
				<summary class="cursor-pointer px-4 py-3 font-medium select-none">How to add it to your calendar</summary>
				<div class="grid gap-4 px-4 pb-4 sm:grid-cols-3">
					<div>
						<p class="font-medium">Google Calendar</p>
						<p class="mt-1 text-zinc-600 dark:text-zinc-400">On a computer: <strong>Other calendars → + → From URL</strong>, paste the link, then <strong>Add calendar</strong>. It appears on your phone too. Google refreshes it every few hours.</p>
					</div>
					<div>
						<p class="font-medium">Apple Calendar</p>
						<p class="mt-1 text-zinc-600 dark:text-zinc-400">iPhone: <strong>Settings → Apps → Calendar → Calendar Accounts → Add Account → Other → Add Subscribed Calendar</strong>. Mac: <strong>File → New Calendar Subscription</strong>. Includes a reminder a week before.</p>
					</div>
					<div>
						<p class="font-medium">Outlook</p>
						<p class="mt-1 text-zinc-600 dark:text-zinc-400">Outlook.com: <strong>Add calendar → Subscribe from web</strong>, paste the link, then <strong>Import</strong>.</p>
					</div>
				</div>
			</details>

			<div class="mt-4 flex flex-wrap gap-2">
				<form method="POST" action="?/calendarReset" use:enhance={({ cancel }) => { if (!confirm('Create a new link? The current one will stop working, so you’ll need to re-subscribe.')) cancel(); }}>
					<button class="btn-ghost px-3 py-1.5">Create a new link</button>
				</form>
				<form method="POST" action="?/calendarDisable" use:enhance={({ cancel }) => { if (!confirm('Turn off the calendar link? Subscribed calendars will stop updating.')) cancel(); }}>
					<button class="btn-ghost px-3 py-1.5 text-red-600 dark:text-red-400">Turn off</button>
				</form>
			</div>
		{:else}
			<form method="POST" action="?/calendarReset" use:enhance class="mt-4">
				<button class="btn-secondary">Create my calendar link</button>
			</form>
		{/if}
	</section>

	<section class="card p-6 lg:col-span-2">
		<h2 class="font-semibold">Emergency contacts</h2>
		<p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
			Shown on every vehicle’s emergency card, so they’re one tap away if you break down or have an accident.
		</p>

		{#if data.contacts.length}
			<ul class="mt-4 divide-y divide-zinc-200 dark:divide-zinc-800">
				{#each data.contacts as c (c.id)}
					<li class="flex items-center gap-4 py-3">
						<div class="min-w-0 flex-1">
							<p class="font-medium">{c.name}{#if c.relationship}<span class="font-normal text-zinc-500"> · {c.relationship}</span>{/if}</p>
							<a href={telHref(c.phone)} class="text-sm text-emerald-700 hover:underline dark:text-emerald-400">{c.phone}</a>
						</div>
						<form method="POST" action="?/deleteContact" use:enhance>
							<input type="hidden" name="id" value={c.id} />
							<button class="btn-ghost px-3 py-1.5 text-red-600 dark:text-red-400" aria-label="Remove {c.name}">Remove</button>
						</form>
					</li>
				{/each}
			</ul>
		{/if}

		<form method="POST" action="?/addContact" use:enhance class="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
			<div>
				<label class="label" for="c-name">Name</label>
				<input class="input" id="c-name" name="name" required />
			</div>
			<div>
				<label class="label" for="c-rel">Relationship</label>
				<input class="input" id="c-rel" name="relationship" placeholder="e.g. Partner" />
			</div>
			<div>
				<label class="label" for="c-phone">Phone</label>
				<input class="input" id="c-phone" name="phone" type="tel" required />
			</div>
			<button class="btn-secondary">Add contact</button>
			{#if form?.contact?.error}<p class="alert-error sm:col-span-4">{form.contact.error}</p>{/if}
		</form>
	</section>
</div>
