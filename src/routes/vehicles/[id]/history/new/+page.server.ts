import { fail, redirect } from '@sveltejs/kit';
import { values } from '$lib/server/form';
import { ACCEPT, saveDocument } from '$lib/server/documents';
import { createRecord, readRecordForm } from '$lib/server/history';
import { requireVehicle } from '$lib/server/vehicles';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, locals }) => ({
	vehicle: requireVehicle(params.id, locals.user, 'editor'),
	accept: ACCEPT
});

export const actions: Actions = {
	default: async ({ params, locals, request }) => {
		const vehicle = requireVehicle(params.id, locals.user, 'editor');
		const fd = await request.formData();
		const { data, error } = readRecordForm(fd);
		if (error) return fail(400, { error, values: values(fd) });

		const file = fd.get('file');
		const hasFile = file instanceof File && file.size > 0;
		const recordId = createRecord(vehicle.id, locals.user!.id, data);
		if (hasFile) {
			const saved = await saveDocument(vehicle.id, locals.user!.id, file, {
				title: `${data.title} receipt`,
				itemId: null,
				recordId
			});
			// The record is saved either way; send them to it so they can retry the upload.
			if (saved.error) redirect(303, `/vehicles/${vehicle.id}/history/${recordId}?uploadError=${encodeURIComponent(saved.error)}`);
		}
		redirect(303, `/vehicles/${vehicle.id}#history`);
	}
};
