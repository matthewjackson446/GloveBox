import { fail, redirect } from '@sveltejs/kit';
import { values } from '$lib/server/form';
import { deleteVehicle, readVehicleForm, requireVehicle, updateVehicle } from '$lib/server/vehicles';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, locals }) => ({
	vehicle: requireVehicle(params.id, locals.user, 'editor')
});

export const actions: Actions = {
	save: async ({ params, locals, request }) => {
		const vehicle = requireVehicle(params.id, locals.user, 'editor');
		const fd = await request.formData();
		const { data, error } = readVehicleForm(fd);
		if (error) return fail(400, { error, values: values(fd) });
		updateVehicle(vehicle.id, data);
		redirect(303, `/vehicles/${vehicle.id}`);
	},

	delete: async ({ params, locals }) => {
		const vehicle = requireVehicle(params.id, locals.user, 'owner');
		deleteVehicle(vehicle.id);
		redirect(303, '/');
	}
};
