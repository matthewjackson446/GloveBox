import { json } from '@sveltejs/kit';
import { listVehicles } from '$lib/server/vehicles';
import type { RequestHandler } from './$types';

/**
 * Pages the service worker should keep for offline use: the emergency card list
 * and each vehicle's card. Signed-out requests are redirected to /login by the
 * hooks, which tells the service worker to clear what it saved.
 */
export const GET: RequestHandler = ({ locals }) =>
	json(
		{ urls: ['/emergency', ...listVehicles(locals.user!.id).map((v) => `/vehicles/${v.id}/emergency`)] },
		{ headers: { 'Cache-Control': 'no-store' } }
	);
