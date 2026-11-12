<script lang="ts">
	import { enhance } from '$app/forms';
	import { telHref } from '$lib/format';

	let { data, form } = $props();
</script>

<svelte:head><title>Settings · Glovebox</title></svelte:head>

<div class="flex flex-wrap items-end justify-between gap-4">
	<h1 class="text-2xl font-semibold tracking-tight">Settings</h1>
	{#if data.user?.role === 'admin'}
		<a href="/settings/users" class="btn-secondary">Manage users</a>
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
