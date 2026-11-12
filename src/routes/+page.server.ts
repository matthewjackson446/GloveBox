import { listItems, listVehicles } from '$lib/server/vehicles';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	const vehicles = listVehicles(locals.user!.id);
	const items = listItems(vehicles.map((v) => v.id));
	return { vehicles, items };
};
