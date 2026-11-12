import { error, fail, redirect } from '@sveltejs/kit';
import { isItemType } from '$lib/items';
import { values } from '$lib/server/form';
import { createItem, readItemForm, requireVehicle } from '$lib/server/vehicles';
import type { Actions, PageServerLoad } from './$types';

function getType(url: URL): string {
	const type = url.searchParams.get('type') ?? 'other';
	if (!isItemType(type)) error(400, 'Unknown item type');
	return type;
}

export const load: PageServerLoad = ({ params, locals, url }) => ({
	vehicle: requireVehicle(params.id, locals.user, 'editor'),
	type: getType(url)
});

export const actions: Actions = {
	default: async ({ params, locals, request, url }) => {
		const vehicle = requireVehicle(params.id, locals.user, 'editor');
		const type = getType(url);
		const fd = await request.formData();
		const { data, error } = readItemForm(fd, type);
		if (error) return fail(400, { error, values: values(fd) });
		createItem(vehicle.id, type, data);
		redirect(303, `/vehicles/${vehicle.id}`);
	}
};
