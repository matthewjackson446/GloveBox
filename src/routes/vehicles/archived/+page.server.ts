import { listArchivedVehicles } from '$lib/server/vehicles';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => ({
	vehicles: listArchivedVehicles(locals.user!.id)
});
