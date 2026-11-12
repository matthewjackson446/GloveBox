import { fail, redirect } from '@sveltejs/kit';
import {
	MIN_PASSWORD_LENGTH,
	createSession,
	hashPassword,
	isValidEmail,
	normaliseEmail,
	setSessionCookie,
	userCount
} from '$lib/server/auth';
import { db } from '$lib/server/db';
import { text, values } from '$lib/server/form';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async (event) => {
		if (userCount() > 0) redirect(303, '/login');

		const fd = await event.request.formData();
		const name = text(fd, 'name', 80);
		const email = normaliseEmail(text(fd, 'email', 254) ?? '');
		const password = (fd.get('password') as string | null) ?? '';
		const confirm = (fd.get('confirm') as string | null) ?? '';

		const err = (message: string) => fail(400, { error: message, values: values(fd) });
		if (!name) return err('Enter your name.');
		if (!isValidEmail(email)) return err('Enter a valid email address.');
		if (password.length < MIN_PASSWORD_LENGTH)
			return err(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
		if (password !== confirm) return err('Passwords don’t match.');

		const hash = await hashPassword(password);
		// Re-check inside the insert so two simultaneous first-run submissions can't both become admin.
		const conn = db();
		const userId = conn.transaction(() => {
			if (userCount() > 0) return null;
			const r = conn
				.prepare(`INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, 'admin')`)
				.run(email, name, hash);
			return Number(r.lastInsertRowid);
		})();
		if (userId === null) redirect(303, '/login');

		const session = createSession(userId);
		setSessionCookie(event, session.token, session.expires);
		redirect(303, '/');
	}
};
