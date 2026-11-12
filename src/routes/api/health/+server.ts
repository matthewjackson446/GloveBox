import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';

/** Used by the Docker HEALTHCHECK. */
export function GET() {
	try {
		db().prepare('SELECT 1').get();
		return json({ status: 'ok' });
	} catch (e) {
		console.error('[glovebox] health check failed', e);
		return json({ status: 'error' }, { status: 503 });
	}
}
