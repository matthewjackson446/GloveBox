import { fail } from '@sveltejs/kit';
import {
	MIN_PASSWORD_LENGTH,
	deleteUserSessions,
	hashPassword,
	isValidEmail,
	normaliseEmail,
	verifyPassword
} from '$lib/server/auth';
import { db } from '$lib/server/db';
import { bad, ok, text } from '$lib/server/form';
import type { Contact } from '$lib/types';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	const contacts = db()
		.prepare('SELECT * FROM contacts WHERE user_id = ? ORDER BY id')
		.all(locals.user!.id) as Contact[];
	return { contacts };
};

export const actions: Actions = {
	profile: async ({ request, locals }) => {
		const fd = await request.formData();
		const name = text(fd, 'name', 80);
		const email = normaliseEmail(text(fd, 'email', 254) ?? '');
		if (!name) return fail(400, { profile: bad('Enter your name.') });
		if (!isValidEmail(email)) return fail(400, { profile: bad('Enter a valid email address.') });
		const taken = db()
			.prepare('SELECT 1 FROM users WHERE email = ? AND id != ?')
			.get(email, locals.user!.id);
		if (taken) return fail(400, { profile: bad('Another account already uses that email.') });
		db().prepare('UPDATE users SET name = ?, email = ? WHERE id = ?').run(name, email, locals.user!.id);
		return { profile: ok('Profile saved.') };
	},

	password: async ({ request, locals }) => {
		const fd = await request.formData();
		const current = (fd.get('current') as string | null) ?? '';
		const next = (fd.get('password') as string | null) ?? '';
		const confirm = (fd.get('confirm') as string | null) ?? '';
		const row = db().prepare('SELECT password_hash FROM users WHERE id = ?').get(locals.user!.id) as {
			password_hash: string;
		};
		if (!(await verifyPassword(current, row.password_hash)))
			return fail(400, { password: bad('Your current password is incorrect.') });
		if (next.length < MIN_PASSWORD_LENGTH)
			return fail(400, { password: bad(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`) });
		if (next !== confirm) return fail(400, { password: bad('New passwords don’t match.') });
		db()
			.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
			.run(await hashPassword(next), locals.user!.id);
		deleteUserSessions(locals.user!.id, locals.sessionToken);
		return { password: ok('Password changed. Other devices have been signed out.') };
	},

	addContact: async ({ request, locals }) => {
		const fd = await request.formData();
		const name = text(fd, 'name', 80);
		const phone = text(fd, 'phone', 40);
		const relationship = text(fd, 'relationship', 40);
		if (!name || !phone) return fail(400, { contact: bad('Name and phone number are required.') });
		db()
			.prepare('INSERT INTO contacts (user_id, name, relationship, phone) VALUES (?, ?, ?, ?)')
			.run(locals.user!.id, name, relationship, phone);
		return { contact: ok('Contact added.') };
	},

	deleteContact: async ({ request, locals }) => {
		const fd = await request.formData();
		db()
			.prepare('DELETE FROM contacts WHERE id = ? AND user_id = ?')
			.run(Number(fd.get('id')), locals.user!.id);
	}
};
