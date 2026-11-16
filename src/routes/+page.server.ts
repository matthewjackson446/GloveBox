import { archivedCount, listItems, listVehicles } from '$lib/server/vehicles';
import { lastServices } from '$lib/server/history';
import { openAdvisories } from '$lib/server/advisories';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	const vehicles = listVehicles(locals.user!.id);
	const ids = vehicles.map((v) => v.id);
	return {
		vehicles,
		items: listItems(ids),
		lastServices: lastServices(ids),
		advisories: openAdvisories(ids),
		archived: archivedCount(locals.user!.id)
	};
};
