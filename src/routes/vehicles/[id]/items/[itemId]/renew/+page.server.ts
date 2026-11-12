import { error, fail, redirect } from '@sveltejs/kit';
import { isRenewable } from '$lib/items';
import { todayISO } from '$lib/status';
import { values } from '$lib/server/form';
import { addYear, itemHistory, readRenewForm, renewItem } from '$lib/server/history';
import { getItem, requireVehicle } from '$lib/server/vehicles';
import type { Actions, PageServerLoad } from './$types';

function load_(params: { id: string; itemId: string }, user: App.Locals['user']) {
	const vehicle = requireVehicle(params.id, user, 'editor');
	const item = getItem(vehicle.id, params.itemId);
	if (!isRenewable(item.type)) error(400, 'This item can’t be renewed. Record MOTs and services in the service history.');
	return { vehicle, item };
}

export const load: PageServerLoad = ({ params, locals }) => {
	const { vehicle, item } = load_(params, locals.user);
	// The new period normally starts when the old one ends, and runs for a year.
	const start = item.due_date ?? todayISO();
	return {
		vehicle,
		item,
		defaults: { start_date: start, due_date: addYear(start) },
		history: itemHistory(item.id)
	};
};

export const actions: Actions = {
	default: async ({ params, locals, request }) => {
		const { vehicle, item } = load_(params, locals.user);
		const fd = await request.formData();
		const { data, error } = readRenewForm(fd);
		if (error) return fail(400, { error, values: values(fd) });
		renewItem(item, data);
		redirect(303, `/vehicles/${vehicle.id}`);
	}
};
