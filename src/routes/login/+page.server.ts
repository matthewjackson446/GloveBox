import { fail, redirect } from '@sveltejs/kit';
import {
	clearFailedLogins,
	createSession,
	findUserByEmail,
	getDummyHash,
	isThrottled,
	normaliseEmail,
	recordFailedLogin,
	setSessionCookie,
	verifyPassword
} from '$lib/server/auth';
import { text } from '$lib/server/form';
import type { Actions, PageServerLoad } from './$types';

/** Only allow same-site relative redirects after login. */
function safeNext(next: string | null): string {
	return next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
}

export const load: PageServerLoad = ({ locals, url }) => {
	if (locals.user) redirect(303, safeNext(url.searchParams.get('next')));
};

export const actions: Actions = {
	default: async (event) => {
		const fd = await event.request.formData();
		const email = normaliseEmail(text(fd, 'email', 254) ?? '');
		const password = (fd.get('password') as string | null) ?? '';
		const key = `${event.getClientAddress()}|${email}`;

		if (isThrottled(key))
			return fail(429, { error: 'Too many attempts. Try again in 15 minutes.', email });

		const user = email ? findUserByEmail(email) : undefined;
		const ok = user
			? await verifyPassword(password, user.password_hash)
			: (await verifyPassword(password, await getDummyHash()), false);

		if (!user || !ok) {
			recordFailedLogin(key);
			return fail(400, { error: 'Incorrect email or password.', email });
		}

		clearFailedLogins(key);
		const session = createSession(user.id);
		setSessionCookie(event, session.token, session.expires);
		redirect(303, safeNext(event.url.searchParams.get('next')));
	}
};
