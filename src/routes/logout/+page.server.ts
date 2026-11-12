import { redirect } from '@sveltejs/kit';
import { clearSessionCookie, deleteSession } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => redirect(303, '/');

export const actions: Actions = {
	default: async (event) => {
		if (event.locals.sessionToken) deleteSession(event.locals.sessionToken);
		clearSessionCookie(event);
		redirect(303, '/login');
	}
};
