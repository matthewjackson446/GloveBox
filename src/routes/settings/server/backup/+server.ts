import { error } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readdir, stat, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { Zip, ZipDeflate, ZipPassThrough } from 'fflate';
import { todayISO } from '$lib/status';
import { dataDir, db } from '$lib/server/db';
import { appVersion } from '$lib/server/version';
import type { RequestHandler } from './$types';

const RESTORE = `Glovebox backup
===============

This ZIP holds everything Glovebox stores:
  glovebox.db   the database (vehicles, renewals, history, users, settings)
  documents/    uploaded files, one folder per vehicle

It contains password hashes, API keys and SMTP settings. Keep it somewhere safe.

To restore:
  1. Stop the Glovebox container.
  2. Empty its appdata folder (e.g. /mnt/user/appdata/glovebox), keeping a copy first.
  3. Extract this ZIP into that folder, so glovebox.db and documents/ sit at the top.
  4. Start the container. The database is upgraded automatically if the backup is from an older version.
`;

/** Every file under documents/, as [path inside the zip, path on disk]. */
async function documentFiles(): Promise<[string, string][]> {
	const root = join(dataDir(), 'documents');
	const out: [string, string][] = [];
	let vehicles: string[] = [];
	try {
		vehicles = await readdir(root);
	} catch {
		return out; // no uploads yet
	}
	for (const v of vehicles) {
		const dir = join(root, v);
		if (!(await stat(dir)).isDirectory()) continue;
		for (const f of await readdir(dir)) out.push([`documents/${v}/${f}`, join(dir, f)]);
	}
	return out;
}

/** Admin only: download a ZIP of the database and all documents. */
export const GET: RequestHandler = async ({ locals }) => {
	if (locals.user?.role !== 'admin') error(403, 'Only admins can download backups');

	// A consistent snapshot of the live database (safe while it's in use).
	const snapshot = join(dataDir(), `.backup-${randomUUID()}.db`);
	await db().backup(snapshot);
	const files = await documentFiles();

	const stream = new ReadableStream<Uint8Array>({
		async start(controller) {
			const zip = new Zip((err, chunk, final) => {
				if (err) return controller.error(err);
				controller.enqueue(chunk);
				if (final) controller.close();
			});
			const addFile = async (name: string, path: string, compress: boolean) => {
				const entry = compress ? new ZipDeflate(name, { level: 6 }) : new ZipPassThrough(name);
				zip.add(entry);
				for await (const chunk of createReadStream(path)) entry.push(chunk as Uint8Array);
				entry.push(new Uint8Array(0), true);
			};
			try {
				const readme = new ZipDeflate('README.txt', { level: 6 });
				zip.add(readme);
				readme.push(new TextEncoder().encode(`${RESTORE}\nCreated ${new Date().toISOString()} by Glovebox ${appVersion()}.\n`), true);
				await addFile('glovebox.db', snapshot, true);
				// PDFs and photos are already compressed; store them as-is.
				for (const [name, path] of files) await addFile(name, path, false);
				zip.end();
			} catch (e) {
				controller.error(e);
			} finally {
				await unlink(snapshot).catch(() => {});
			}
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'application/zip',
			'Content-Disposition': `attachment; filename="glovebox-backup-${todayISO()}.zip"`,
			'Cache-Control': 'private, no-store'
		}
	});
};
