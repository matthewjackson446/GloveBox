<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();
	let resetFor = $state<number | null>(null);
</script>

<svelte:head><title>Users · Glovebox</title></svelte:head>

<a href="/settings" class="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">← Settings</a>
<h1 class="mt-2 text-2xl font-semibold tracking-tight">Users</h1>
<p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
	Everyone here can sign in and add their own vehicles. Share a vehicle from its page to let others see or edit it.
</p>

{#if form?.rowError}<p class="alert-error mt-6">{form.rowError}</p>{/if}
{#if form?.rowSuccess}<p class="alert-success mt-6">{form.rowSuccess}</p>{/if}

<div class="card mt-6 divide-y divide-zinc-200 dark:divide-zinc-800">
	{#each data.users as u (u.id)}
		<div class="flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
			<div class="min-w-0 flex-1">
				<p class="font-medium">
					{u.name}
					{#if u.id === data.user?.id}<span class="text-sm font-normal text-zinc-500">(you)</span>{/if}
				</p>
				<p class="truncate text-sm text-zinc-500 dark:text-zinc-400">{u.email} · {u.vehicles} vehicle{u.vehicles === 1 ? '' : 's'}</p>
			</div>
			<form method="POST" action="?/role" use:enhance>
				<input type="hidden" name="id" value={u.id} />
				<select
					name="role"
					class="input w-auto py-1.5"
					value={u.role}
					disabled={u.id === data.user?.id}
					onchange={(e) => e.currentTarget.form?.requestSubmit()}
					aria-label="Role for {u.name}"
				>
					<option value="member">Member</option>
					<option value="admin">Admin</option>
				</select>
			</form>
			<button class="btn-ghost px-3 py-1.5" onclick={() => (resetFor = resetFor === u.id ? null : u.id)}>Reset password</button>
			{#if u.id !== data.user?.id}
				<form
					method="POST"
					action="?/delete"
					use:enhance={({ cancel }) => {
						if (!confirm(`Delete ${u.name}? Vehicles only they own will be transferred to you.`)) cancel();
					}}
				>
					<input type="hidden" name="id" value={u.id} />
					<button class="btn-ghost px-3 py-1.5 text-red-600 dark:text-red-400">Delete</button>
				</form>
			{/if}
			{#if resetFor === u.id}
				<form
					method="POST"
					action="?/resetPassword"
					class="flex w-full gap-2"
					use:enhance={() => async ({ update, result }) => {
						await update();
						if (result.type === 'success') resetFor = null;
					}}
				>
					<input type="hidden" name="id" value={u.id} />
					<input class="input" name="password" type="text" minlength="8" required placeholder="New temporary password" aria-label="New password" />
					<button class="btn-primary shrink-0">Set password</button>
				</form>
			{/if}
		</div>
	{/each}
</div>

<section class="card mt-8 p-6">
	<h2 class="font-semibold">Add a user</h2>
	<form method="POST" action="?/create" use:enhance class="mt-4 grid gap-4 sm:grid-cols-2">
		{#if form?.create?.error}<p class="alert-error sm:col-span-2">{form.create.error}</p>{/if}
		{#if form?.create?.success}<p class="alert-success sm:col-span-2">{form.create.success}</p>{/if}
		<div>
			<label class="label" for="name">Name</label>
			<input class="input" id="name" name="name" required value={form?.create?.values?.name ?? ''} />
		</div>
		<div>
			<label class="label" for="email">Email</label>
			<input class="input" id="email" name="email" type="email" required value={form?.create?.values?.email ?? ''} />
		</div>
		<div>
			<label class="label" for="password">Temporary password</label>
			<input class="input" id="password" name="password" type="text" minlength="8" required autocomplete="off" />
			<p class="mt-1.5 text-xs text-zinc-500">Share it with them; they can change it in Settings.</p>
		</div>
		<div>
			<label class="label" for="role">Role</label>
			<select class="input" id="role" name="role">
				<option value="member">Member</option>
				<option value="admin">Admin: can manage users</option>
			</select>
		</div>
		<div class="sm:col-span-2"><button class="btn-primary">Add user</button></div>
	</form>
</section>
