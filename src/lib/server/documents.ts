import { randomUUID } from 'node:crypto';
import { mkdir, rm, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { DocumentRow } from '$lib/types';
import { dataDir, db } from './db';

/** Uploaded files live in <DATA_DIR>/documents/<vehicleId>/<uuid>.<ext>, i.e. in /config with the database. */
const docsDir = () => join(dataDir(), 'documents');

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

const TYPES: { mime: string; ext: string; test: (b: Buffer) => boolean }[] = [
	{ mime: 'application/pdf', ext: 'pdf', test: (b) => b.subarray(0, 5).toString('latin1') === '%PDF-' },
	{ mime: 'image/png', ext: 'png', test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
	{ mime: 'image/jpeg', ext: 'jpg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
	{ mime: 'image/gif', ext: 'gif', test: (b) => b.subarray(0, 4).toString('latin1') === 'GIF8' },
	{ mime: 'image/webp', ext: 'webp', test: (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP' },
	{
		mime: 'image/heic',
		ext: 'heic',
		test: (b) => b.subarray(4, 8).toString('latin1') === 'ftyp' && /^(heic|heix|hevc|mif1|msf1|heif)$/.test(b.subarray(8, 12).toString('latin1'))
	}
];

/** What a file really is, by its first bytes. The browser's claimed type is ignored. */
function sniff(buf: Buffer) {
	return TYPES.find((t) => buf.length >= 12 && t.test(buf)) ?? null;
}

export const ACCEPT = 'application/pdf,image/png,image/jpeg,image/gif,image/webp,image/heic,.heic';

export async function saveDocument(
	vehicleId: number,
	userId: number,
	file: File,
	opts: { title: string | null; itemId: number | null; recordId: number | null }
): Promise<{ id?: number; error?: string }> {
	if (!file || file.size === 0) return { error: 'Choose a file to upload.' };
	if (file.size > MAX_UPLOAD_BYTES) return { error: 'Files can be up to 20 MB.' };

	const buf = Buffer.from(await file.arrayBuffer());
	const type = sniff(buf);
	if (!type) return { error: 'Only PDFs and photos (JPG, PNG, HEIC, WebP, GIF) can be uploaded.' };

	const storedName = `${randomUUID()}.${type.ext}`;
	const dir = join(docsDir(), String(vehicleId));
	await mkdir(dir, { recursive: true });
	await writeFile(join(dir, storedName), buf);

	const filename = (file.name || `document.${type.ext}`).replace(/[\r\n"\\/]/g, '_').slice(0, 200);
	const title = opts.title ?? filename.replace(/\.[^.]+$/, '');
	const r = db()
		.prepare(
			`INSERT INTO documents (vehicle_id, item_id, record_id, title, filename, stored_name, mime, size, uploaded_by)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.run(vehicleId, opts.itemId, opts.recordId, title.slice(0, 120), filename, storedName, type.mime, buf.length, userId);
	return { id: Number(r.lastInsertRowid) };
}

export function listDocuments(vehicleId: number): DocumentRow[] {
	return db()
		.prepare(
			'SELECT id, vehicle_id, item_id, record_id, title, filename, mime, size, created_at FROM documents WHERE vehicle_id = ? ORDER BY created_at DESC, id DESC'
		)
		.all(vehicleId) as DocumentRow[];
}

export function getDocument(vehicleId: number, docId: number) {
	return db()
		.prepare('SELECT * FROM documents WHERE id = ? AND vehicle_id = ?')
		.get(docId, vehicleId) as (DocumentRow & { stored_name: string }) | undefined;
}

export function documentPath(doc: { vehicle_id: number; stored_name: string }): string {
	return join(docsDir(), String(doc.vehicle_id), doc.stored_name);
}

export async function deleteDocument(vehicleId: number, docId: number) {
	const doc = getDocument(vehicleId, docId);
	if (!doc) return;
	db().prepare('DELETE FROM documents WHERE id = ?').run(doc.id);
	await unlink(documentPath(doc)).catch(() => {});
}

/** Called when a vehicle is deleted (the rows go via ON DELETE CASCADE). */
export async function deleteVehicleFiles(vehicleId: number) {
	await rm(join(docsDir(), String(vehicleId)), { recursive: true, force: true });
}
