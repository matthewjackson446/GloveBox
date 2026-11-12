import { fail, redirect } from '@sveltejs/kit';
import { values } from '$lib/server/form';
import { createVehicle, readVehicleForm } from '$lib/server/vehicles';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const fd = await request.formData();
		const { data, error } = readVehicleForm(fd);
		if (error) return fail(400, { error, values: values(fd) });
		const id = createVehicle(locals.user!.id, data);
		redirect(303, `/vehicles/${id}`);
	}
};
