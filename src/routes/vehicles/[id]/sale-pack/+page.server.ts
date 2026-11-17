import { db } from '$lib/server/db';
import { listDocuments } from '$lib/server/documents';
import { listRecords } from '$lib/server/history';
import { requireVehicle } from '$lib/server/vehicles';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, locals }) => {
	const vehicle = requireVehicle(params.id, locals.user);
	const records = listRecords(vehicle.id);
	const tests = db().prepare('SELECT count(*) AS n FROM mot_tests WHERE vehicle_id = ?').get(vehicle.id) as { n: number };
	return {
		vehicle,
		documents: listDocuments(vehicle.id),
		recordCount: records.length,
		hasCosts: records.some((r) => r.cost != null),
		hasNotes: records.some((r) => r.notes),
		motCount: tests.n
	};
};
