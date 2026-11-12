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
import { lookupsConfigured, syncVehicle } from '$lib/server/lookup/sync';
import { ACCEPT, deleteDocument, listDocuments, saveDocument } from '$lib/server/documents';
import { listRecords, mileageHistory, spending } from '$lib/server/history';
import { todayISO } from '$lib/status';
import type { MotTest, VehicleRole } from '$lib/types';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, locals }) => {
	const vehicle = requireVehicle(params.id, locals.user);
	return {
		vehicle,
		items: listItems([vehicle.id]),
		members: vehicle.role === 'owner' ? listMembers(vehicle.id) : [],
		motTests: db()
			.prepare('SELECT * FROM mot_tests WHERE vehicle_id = ? ORDER BY completed_at DESC')
			.all(vehicle.id) as MotTest[],
		lookupsEnabled: lookupsConfigured(),
		records: listRecords(vehicle.id),
		documents: listDocuments(vehicle.id),
		mileage: mileageHistory(vehicle.id),
		spending: spending(vehicle.id),
		accept: ACCEPT
	};
};

/** "item:12" / "record:4" from the upload form's "Attach to" menu, checked against this vehicle. */
function parseLink(vehicleId: number, link: FormDataEntryValue | null) {
	const [kind, id] = String(link ?? '').split(':');
	const n = Number(id);
	if (kind === 'item' && listItems([vehicleId]).some((i) => i.id === n)) return { itemId: n, recordId: null };
	if (kind === 'record' && listRecords(vehicleId).some((r) => r.id === n)) return { itemId: null, recordId: n };
	return { itemId: null, recordId: null };
}

const ROLES: VehicleRole[] = ['owner', 'editor', 'viewer'];
const parseRole = (v: FormDataEntryValue | null): VehicleRole =>
	ROLES.includes(v as VehicleRole) ? (v as VehicleRole) : 'viewer';

export const actions: Actions = {
	uploadDocument: async ({ params, locals, request }) => {
		const vehicle = requireVehicle(params.id, locals.user, 'editor');
		const fd = await request.formData();
		const file = fd.get('file');
		if (!(file instanceof File)) return fail(400, { uploadError: 'Choose a file to upload.' });
		const r = await saveDocument(vehicle.id, locals.user!.id, file, {
			title: text(fd, 'title', 120),
			...parseLink(vehicle.id, fd.get('link'))
		});
		return r.error ? fail(400, { uploadError: r.error }) : { uploadSuccess: 'Uploaded.' };
	},

	deleteDocument: async ({ params, locals, request }) => {
		const vehicle = requireVehicle(params.id, locals.user, 'editor');
		await deleteDocument(vehicle.id, Number((await request.formData()).get('docId')));
	},

	refresh: async ({ params, locals }) => {
		const vehicle = requireVehicle(params.id, locals.user, 'editor');
		if (!lookupsConfigured()) return fail(400, { refresh: { changes: [], errors: ['Lookups aren’t set up on this server.'] } });
		return { refresh: await syncVehicle(vehicle.id) };
	},

	mileage: async ({ params, locals, request }) => {
		const vehicle = requireVehicle(params.id, locals.user, 'editor');
		const mileage = int(await request.formData(), 'mileage');
		if (mileage === null || mileage < 0) return fail(400, { mileageError: 'Enter a valid mileage.' });
		// An exact value, so typos can be corrected downwards too; also kept as a reading.
		db()
			.prepare(`UPDATE vehicles SET mileage = ?, updated_at = datetime('now') WHERE id = ?`)
			.run(mileage, vehicle.id);
		db()
			.prepare('INSERT INTO mileage_log (vehicle_id, date, mileage) VALUES (?, ?, ?)')
			.run(vehicle.id, todayISO(), mileage);
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
