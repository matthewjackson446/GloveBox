import { db } from '$lib/server/db';
import { listItems, requireVehicle } from '$lib/server/vehicles';
import type { Contact } from '$lib/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, locals }) => {
	const vehicle = requireVehicle(params.id, locals.user);
	const items = listItems([vehicle.id]).filter((i) =>
		['breakdown', 'insurance', 'warranty'].includes(i.type)
	);
	const contacts = db()
		.prepare('SELECT * FROM contacts WHERE user_id = ? ORDER BY id')
		.all(locals.user!.id) as Contact[];
	return { vehicle, items, contacts };
};
