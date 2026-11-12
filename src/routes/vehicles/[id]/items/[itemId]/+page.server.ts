import { fail, redirect } from '@sveltejs/kit';
import { isItemType } from '$lib/items';
import { ACCEPT, deleteDocument, listDocuments, saveDocument } from '$lib/server/documents';
import { text, values } from '$lib/server/form';
import { itemHistory } from '$lib/server/history';
import { deleteItem, getItem, readItemForm, requireVehicle, updateItem } from '$lib/server/vehicles';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, locals }) => {
	const vehicle = requireVehicle(params.id, locals.user, 'editor');
	const item = getItem(vehicle.id, params.itemId);
	return {
		vehicle,
		item,
		history: itemHistory(item.id),
		documents: listDocuments(vehicle.id).filter((d) => d.item_id === item.id),
		accept: ACCEPT
	};
};

export const actions: Actions = {
	save: async ({ params, locals, request }) => {
		const vehicle = requireVehicle(params.id, locals.user, 'editor');
		const item = getItem(vehicle.id, params.itemId);
		const fd = await request.formData();
		const { data, error } = readItemForm(fd, isItemType(item.type) ? item.type : 'other');
		if (error) return fail(400, { error, values: values(fd) });
		updateItem(item.id, data);
		redirect(303, `/vehicles/${vehicle.id}`);
	},

	uploadDoc: async ({ params, locals, request }) => {
		const vehicle = requireVehicle(params.id, locals.user, 'editor');
		const item = getItem(vehicle.id, params.itemId);
		const fd = await request.formData();
		const file = fd.get('file');
		if (!(file instanceof File)) return fail(400, { uploadError: 'Choose a file to upload.' });
		const r = await saveDocument(vehicle.id, locals.user!.id, file, { title: text(fd, 'title', 120), itemId: item.id, recordId: null });
		return r.error ? fail(400, { uploadError: r.error }) : { uploadSuccess: 'Uploaded.' };
	},

	deleteDoc: async ({ params, locals, request }) => {
		const vehicle = requireVehicle(params.id, locals.user, 'editor');
		await deleteDocument(vehicle.id, Number((await request.formData()).get('docId')));
	},

	delete: async ({ params, locals }) => {
		const vehicle = requireVehicle(params.id, locals.user, 'editor');
		const item = getItem(vehicle.id, params.itemId);
		// Attached documents stay on the vehicle (unlinked) rather than being lost.
		deleteItem(item.id);
		redirect(303, `/vehicles/${vehicle.id}`);
	}
};
