import { listVehicles } from '$lib/server/vehicles';
import type { PageServerLoad } from './$types';

/** Every vehicle's emergency card in one place. Also the offline start page. */
export const load: PageServerLoad = ({ locals }) => ({ vehicles: listVehicles(locals.user!.id) });
