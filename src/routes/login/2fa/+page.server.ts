import { fail, redirect } from '@sveltejs/kit';
import { createSession, isSecureRequest, setSessionCookie } from '$lib/server/auth';
import { text } from '$lib/server/form';
import { PENDING_COOKIE, checkSecondFactor, endPending, failPending, getPending } from '$lib/server/totp';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ cookies, locals }) => {
	if (locals.user) redirect(303, '/');
	if (!getPending(cookies.get(PENDING_COOKIE))) redirect(303, '/login');
};

export const actions: Actions = {
	default: async (event) => {
		const token = event.cookies.get(PENDING_COOKIE);
		const pending = getPending(token);
		if (!token || !pending) redirect(303, '/login?expired=1');

		const code = text(await event.request.formData(), 'code', 20) ?? '';
		const result = checkSecondFactor(pending.userId, code);
		if (!result.ok) {
			const stillGoing = failPending(token);
			if (!stillGoing) {
				event.cookies.delete(PENDING_COOKIE, { path: '/login', secure: isSecureRequest(event) });
				redirect(303, '/login?expired=1');
			}
			return fail(400, { error: 'That code isn’t right. Check your authenticator app and try again.' });
		}

		endPending(token);
		event.cookies.delete(PENDING_COOKIE, { path: '/login', secure: isSecureRequest(event) });
		const session = createSession(pending.userId);
		setSessionCookie(event, session.token, session.expires);
		// After using a recovery code, nudge them to Settings to sort out their authenticator.
		redirect(303, result.usedRecovery ? '/settings?recovery=used#security' : pending.next);
	}
};
