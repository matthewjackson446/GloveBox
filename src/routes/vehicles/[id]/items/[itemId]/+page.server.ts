import { fail, redirect } from '@sveltejs/kit';
import { isItemType } from '$lib/items';
import { values } from '$lib/server/form';
import { deleteItem, getItem, readItemForm, requireVehicle, updateItem } from '$lib/server/vehicles';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, locals }) => {
	const vehicle = requireVehicle(params.id, locals.user, 'editor');
	return { vehicle, item: getItem(vehicle.id, params.itemId) };
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

	delete: async ({ params, locals }) => {
		const vehicle = requireVehicle(params.id, locals.user, 'editor');
		const item = getItem(vehicle.id, params.itemId);
		deleteItem(item.id);
		redirect(303, `/vehicles/${vehicle.id}`);
	}
};
