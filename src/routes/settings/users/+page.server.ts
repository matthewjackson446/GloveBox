import { error, fail } from '@sveltejs/kit';
import {
	MIN_PASSWORD_LENGTH,
	deleteUserSessions,
	hashPassword,
	isValidEmail,
	normaliseEmail
} from '$lib/server/auth';
import { db } from '$lib/server/db';
import { bad, ok, text, values } from '$lib/server/form';
import type { UserRole } from '$lib/types';
import type { Actions, PageServerLoad } from './$types';

interface UserRow {
	id: number;
	name: string;
	email: string;
	role: UserRole;
	created_at: string;
	vehicles: number;
}

function requireAdmin(locals: App.Locals) {
	if (locals.user?.role !== 'admin') error(403, 'Only admins can manage users');
	return locals.user;
}

function adminCount(): number {
	return (db().prepare(`SELECT COUNT(*) AS n FROM users WHERE role = 'admin'`).get() as { n: number }).n;
}

export const load: PageServerLoad = ({ locals }) => {
	requireAdmin(locals);
	const users = db()
		.prepare(
			`SELECT u.id, u.name, u.email, u.role, u.created_at,
			   (SELECT COUNT(*) FROM vehicle_users vu WHERE vu.user_id = u.id) AS vehicles
			 FROM users u ORDER BY u.name`
		)
		.all() as UserRow[];
	return { users };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		requireAdmin(locals);
		const fd = await request.formData();
		const name = text(fd, 'name', 80);
		const email = normaliseEmail(text(fd, 'email', 254) ?? '');
		const password = (fd.get('password') as string | null) ?? '';
		const role: UserRole = fd.get('role') === 'admin' ? 'admin' : 'member';
		const err = (message: string) => fail(400, { create: bad(message, values(fd)) });

		if (!name) return err('Enter a name.');
		if (!isValidEmail(email)) return err('Enter a valid email address.');
		if (password.length < MIN_PASSWORD_LENGTH)
			return err(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
		if (db().prepare('SELECT 1 FROM users WHERE email = ?').get(email))
			return err('A user with that email already exists.');

		db()
			.prepare('INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?)')
			.run(email, name, await hashPassword(password), role);
		return { create: ok(`${name} can now sign in with ${email}.`) };
	},

	role: async ({ request, locals }) => {
		const me = requireAdmin(locals);
		const fd = await request.formData();
		const id = Number(fd.get('id'));
		const role: UserRole = fd.get('role') === 'admin' ? 'admin' : 'member';
		if (id === me.id && role !== 'admin') return fail(400, { rowError: 'You can’t remove your own admin access.' });
		db().prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
	},

	resetPassword: async ({ request, locals }) => {
		requireAdmin(locals);
		const fd = await request.formData();
		const id = Number(fd.get('id'));
		const password = (fd.get('password') as string | null) ?? '';
		if (password.length < MIN_PASSWORD_LENGTH)
			return fail(400, { rowError: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
		db().prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(await hashPassword(password), id);
		deleteUserSessions(id);
		return { rowSuccess: 'Password reset. They’ve been signed out everywhere.' };
	},

	delete: async ({ request, locals }) => {
		const me = requireAdmin(locals);
		const fd = await request.formData();
		const id = Number(fd.get('id'));
		if (id === me.id) return fail(400, { rowError: 'You can’t delete your own account.' });
		const target = db().prepare('SELECT role FROM users WHERE id = ?').get(id) as { role: UserRole } | undefined;
		if (!target) return fail(404, { rowError: 'User not found.' });
		if (target.role === 'admin' && adminCount() <= 1)
			return fail(400, { rowError: 'You can’t delete the last admin.' });

		const conn = db();
		conn.transaction(() => {
			// Vehicles this user solely owns are handed to the admin doing the deletion, not lost.
			const orphaned = conn
				.prepare(
					`SELECT vehicle_id FROM vehicle_users vu WHERE user_id = ? AND role = 'owner'
					 AND (SELECT COUNT(*) FROM vehicle_users o WHERE o.vehicle_id = vu.vehicle_id AND o.role = 'owner') = 1`
				)
				.all(id) as { vehicle_id: number }[];
			const adopt = conn.prepare(
				`INSERT INTO vehicle_users (vehicle_id, user_id, role) VALUES (?, ?, 'owner')
				 ON CONFLICT (vehicle_id, user_id) DO UPDATE SET role = 'owner'`
			);
			for (const { vehicle_id } of orphaned) adopt.run(vehicle_id, me.id);
			conn.prepare('DELETE FROM users WHERE id = ?').run(id);
		})();
		return { rowSuccess: 'User deleted. Any vehicles only they owned are now yours.' };
	}
};
