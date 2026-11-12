import { error, fail, redirect } from '@sveltejs/kit';
import { values } from '$lib/server/form';
import { ACCEPT, deleteDocument, listDocuments, saveDocument } from '$lib/server/documents';
import { deleteRecord, getRecord, readRecordForm, updateRecord } from '$lib/server/history';
import { requireVehicle } from '$lib/server/vehicles';
import type { Actions, PageServerLoad } from './$types';

function load_(params: { id: string; recordId: string }, user: App.Locals['user']) {
	const vehicle = requireVehicle(params.id, user, 'editor');
	const record = getRecord(vehicle.id, Number(params.recordId));
	if (!record) error(404, 'History entry not found');
	return { vehicle, record };
}

export const load: PageServerLoad = ({ params, locals, url }) => {
	const { vehicle, record } = load_(params, locals.user);
	return {
		vehicle,
		record,
		documents: listDocuments(vehicle.id).filter((d) => d.record_id === record.id),
		accept: ACCEPT,
		uploadError: url.searchParams.get('uploadError')
	};
};

export const actions: Actions = {
	save: async ({ params, locals, request }) => {
		const { vehicle, record } = load_(params, locals.user);
		const fd = await request.formData();
		const { data, error } = readRecordForm(fd);
		if (error) return fail(400, { error, values: values(fd) });
		updateRecord(vehicle.id, record.id, data);
		const file = fd.get('file');
		if (file instanceof File && file.size > 0) {
			const saved = await saveDocument(vehicle.id, locals.user!.id, file, { title: `${data.title} receipt`, itemId: null, recordId: record.id });
			if (saved.error) return fail(400, { error: saved.error, values: values(fd) });
		}
		redirect(303, `/vehicles/${vehicle.id}#history`);
	},

	deleteDoc: async ({ params, locals, request }) => {
		const { vehicle } = load_(params, locals.user);
		await deleteDocument(vehicle.id, Number((await request.formData()).get('docId')));
	},

	delete: async ({ params, locals }) => {
		const { vehicle, record } = load_(params, locals.user);
		// Attached files stay in the vehicle's documents (unlinked) rather than being lost.
		deleteRecord(record.id);
		redirect(303, `/vehicles/${vehicle.id}#history`);
	}
};
