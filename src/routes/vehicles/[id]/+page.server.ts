import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { normaliseEmail, findUserByEmail } from '$lib/server/auth';
import { int, text } from '$lib/server/form';
import {
	listItems,
	listMembers,
	ownerCount,
	removeMember,
	requireVehicle,
	setMember
} from '$lib/server/vehicles';
import type { VehicleRole } from '$lib/types';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, locals }) => {
	const vehicle = requireVehicle(params.id, locals.user);
	return {
		vehicle,
		items: listItems([vehicle.id]),
		members: vehicle.role === 'owner' ? listMembers(vehicle.id) : []
	};
};

const ROLES: VehicleRole[] = ['owner', 'editor', 'viewer'];
const parseRole = (v: FormDataEntryValue | null): VehicleRole =>
	ROLES.includes(v as VehicleRole) ? (v as VehicleRole) : 'viewer';

export const actions: Actions = {
	mileage: async ({ params, locals, request }) => {
		const vehicle = requireVehicle(params.id, locals.user, 'editor');
		const mileage = int(await request.formData(), 'mileage');
		if (mileage === null || mileage < 0) return fail(400, { mileageError: 'Enter a valid mileage.' });
		db()
			.prepare(`UPDATE vehicles SET mileage = ?, updated_at = datetime('now') WHERE id = ?`)
			.run(mileage, vehicle.id);
	},

	share: async ({ params, locals, request }) => {
		const vehicle = requireVehicle(params.id, locals.user, 'owner');
		const fd = await request.formData();
		const email = normaliseEmail(text(fd, 'email', 254) ?? '');
		const user = email ? findUserByEmail(email) : undefined;
		if (!user)
			return fail(400, {
				shareError: 'No Glovebox user has that email. An admin can add them under Settings → Users.'
			});
		if (user.id === locals.user!.id) return fail(400, { shareError: 'You already own this vehicle.' });
		setMember(vehicle.id, user.id, parseRole(fd.get('role')));
		return { shareSuccess: `Shared with ${user.name}.` };
	},

	setRole: async ({ params, locals, request }) => {
		const vehicle = requireVehicle(params.id, locals.user, 'owner');
		const fd = await request.formData();
		const userId = Number(fd.get('userId'));
		const role = parseRole(fd.get('role'));
		const members = listMembers(vehicle.id);
		const target = members.find((m) => m.user_id === userId);
		if (!target) return fail(404, { shareError: 'That person doesn’t have access.' });
		if (target.role === 'owner' && role !== 'owner' && ownerCount(vehicle.id) <= 1)
			return fail(400, { shareError: 'A vehicle needs at least one owner.' });
		setMember(vehicle.id, userId, role);
	},

	unshare: async ({ params, locals, request }) => {
		const vehicle = requireVehicle(params.id, locals.user, 'owner');
		const userId = Number((await request.formData()).get('userId'));
		const target = listMembers(vehicle.id).find((m) => m.user_id === userId);
		if (!target) return;
		if (target.role === 'owner' && ownerCount(vehicle.id) <= 1)
			return fail(400, { shareError: 'A vehicle needs at least one owner.' });
		removeMember(vehicle.id, userId);
	}
};
