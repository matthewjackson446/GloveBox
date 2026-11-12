import { error } from '@sveltejs/kit';
import { readFile } from 'node:fs/promises';
import { documentPath, getDocument } from '$lib/server/documents';
import { requireVehicle } from '$lib/server/vehicles';
import type { RequestHandler } from './$types';

/** Serve an uploaded document to anyone who can view the vehicle. */
export const GET: RequestHandler = async ({ params, locals, url }) => {
	const vehicle = requireVehicle(params.id, locals.user);
	const doc = getDocument(vehicle.id, Number(params.docId));
	if (!doc) error(404, 'Document not found');

	let body: Buffer;
	try {
		body = await readFile(documentPath(doc));
	} catch {
		error(404, 'The file for this document is missing from the server.');
	}

	// Browsers can't show HEIC, so offer it as a download; PDFs and other images open in the browser.
	const inline = !url.searchParams.has('download') && doc.mime !== 'image/heic';
	const ascii = doc.filename.replace(/[^\x20-\x7e]/g, '_');
	return new Response(new Uint8Array(body), {
		headers: {
			'Content-Type': doc.mime,
			'Content-Length': String(body.length),
			'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(doc.filename)}`,
			// Never cache: these are V5Cs, certificates etc., and must not be viewable after signing out.
			'Cache-Control': 'private, no-store'
		}
	});
};
