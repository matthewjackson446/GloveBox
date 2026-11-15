import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { deleteVehicleFiles } from '$lib/server/documents';
import { values } from '$lib/server/form';
import { lookupsConfigured } from '$lib/server/lookup/sync';
import { archiveVehicle, deleteVehicle, readVehicleForm, requireVehicle, updateVehicle } from '$lib/server/vehicles';
import { date, text } from '$lib/server/form';
import { todayISO } from '$lib/status';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, locals }) => ({
	vehicle: requireVehicle(params.id, locals.user, 'editor'),
	lookupsEnabled: lookupsConfigured()
});

export const actions: Actions = {
	save: async ({ params, locals, request }) => {
		const vehicle = requireVehicle(params.id, locals.user, 'editor');
		const fd = await request.formData();
		const { data, error } = readVehicleForm(fd);
		if (error) return fail(400, { error, values: values(fd) });
		updateVehicle(vehicle.id, data);
		if (fd.get('auto_sync_shown'))
			db().prepare('UPDATE vehicles SET auto_sync = ? WHERE id = ?').run(fd.get('auto_sync') === 'on' ? 1 : 0, vehicle.id);
		redirect(303, `/vehicles/${vehicle.id}`);
	},

	archive: async ({ params, locals, request }) => {
		const vehicle = requireVehicle(params.id, locals.user, 'owner');
		const fd = await request.formData();
		const on = date(fd, 'archived_at') ?? todayISO();
		if (on > todayISO()) return fail(400, { archiveError: 'The date can’t be in the future.' });
		archiveVehicle(vehicle.id, on, text(fd, 'archive_note', 200));
		redirect(303, `/vehicles/${vehicle.id}`);
	},

	delete: async ({ params, locals }) => {
		const vehicle = requireVehicle(params.id, locals.user, 'owner');
		deleteVehicle(vehicle.id);
		await deleteVehicleFiles(vehicle.id);
		redirect(303, '/');
	}
};
