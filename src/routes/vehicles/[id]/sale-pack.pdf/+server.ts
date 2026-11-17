import { error } from '@sveltejs/kit';
import { buildSalePack } from '$lib/server/salepack';
import { requireVehicle } from '$lib/server/vehicles';
import type { RequestHandler } from './$types';

/** Build and download the sale pack. Options come from the form on /vehicles/[id]/sale-pack. */
export const POST: RequestHandler = async ({ params, locals, request }) => {
	const vehicle = requireVehicle(params.id, locals.user);
	const fd = await request.formData();
	const on = (k: string) => fd.get(k) === 'on';
	const docIds = fd
		.getAll('doc')
		.map(Number)
		.filter((n) => Number.isInteger(n) && n > 0);
	const note = String(fd.get('note') ?? '').trim().slice(0, 2000) || null;

	let pdf: Uint8Array;
	try {
		pdf = await buildSalePack(vehicle, {
			vin: on('vin'),
			mileage: on('mileage'),
			service: on('service'),
			notes: on('notes'),
			costs: on('costs'),
			mot: on('mot'),
			docIds,
			sellerNote: note
		});
	} catch (e) {
		console.error('[glovebox] sale pack failed', e);
		error(500, 'The sale pack couldn’t be made. Try leaving out the attached documents.');
	}

	const name = `${vehicle.registration.replace(/\s+/g, '')}-vehicle-history.pdf`;
	return new Response(new Uint8Array(pdf), {
		headers: {
			'Content-Type': 'application/pdf',
			'Content-Disposition': `attachment; filename="${name}"`,
			'Content-Length': String(pdf.length),
			'Cache-Control': 'private, no-store'
		}
	});
};
