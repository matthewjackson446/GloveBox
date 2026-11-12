<script lang="ts">
	import { enhance } from '$app/forms';

	let {
		action = '?/uploadDocument',
		accept,
		links = [],
		error,
		success
	}: {
		action?: string;
		accept: string;
		/** Things a document can be attached to: value is "item:12" or "record:4". */
		links?: { value: string; label: string }[];
		error?: string;
		success?: string;
	} = $props();

	let busy = $state(false);
</script>

<form
	method="POST"
	{action}
	enctype="multipart/form-data"
	class="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-950/60"
	use:enhance={() => {
		busy = true;
		return async ({ update }) => {
			await update();
			busy = false;
		};
	}}
>
	{#if error}<p class="alert-error mb-3">{error}</p>{/if}
	{#if success}<p class="alert-success mb-3">{success}</p>{/if}
	<div class="grid gap-3 sm:items-end {links.length ? 'sm:grid-cols-[1.4fr_1fr_1fr_auto]' : 'sm:grid-cols-[1.4fr_1fr_auto]'}">
		<div>
			<label class="label" for="doc-file">File</label>
			<input class="input file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-200 file:px-3 file:py-1 file:text-sm dark:file:bg-zinc-800" id="doc-file" name="file" type="file" required {accept} />
		</div>
		<div>
			<label class="label" for="doc-title">Name <span class="font-normal text-zinc-400">(optional)</span></label>
			<input class="input" id="doc-title" name="title" maxlength="120" placeholder="e.g. V5C logbook" />
		</div>
		{#if links.length}
			<div>
				<label class="label" for="doc-link">Attach to</label>
				<select class="input" id="doc-link" name="link">
					<option value="">Just this vehicle</option>
					{#each links as l}<option value={l.value}>{l.label}</option>{/each}
				</select>
			</div>
		{/if}
		<button class="btn-secondary" disabled={busy}>{busy ? 'Uploading…' : 'Upload'}</button>
	</div>
	<p class="mt-2 text-xs text-zinc-500">PDFs and photos up to 20 MB, e.g. V5C, insurance certificate, MOT certificate, receipts. Stored on your server in the appdata folder.</p>
</form>
