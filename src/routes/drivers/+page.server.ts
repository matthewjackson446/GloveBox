import { fail } from '@sveltejs/kit';
import {
	addDriver,
	addDriverItem,
	deleteDriver,
	deleteDriverItem,
	listDrivers,
	readDriverItemForm,
	renameDriver,
	renewDriverItem,
	updateDriverItem
} from '$lib/server/drivers';
import { bad, date, ok, text, values } from '$lib/server/form';
import { formatDate } from '$lib/format';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => ({ drivers: listDrivers(locals.user!.id) });

export const actions: Actions = {
	addDriver: async ({ request, locals }) => {
		const name = text(await request.formData(), 'name', 60);
		if (!name) return fail(400, { person: bad('Enter a name.') });
		addDriver(locals.user!.id, name);
		return { person: ok(`${name} added. Now add their renewals.`) };
	},

	renameDriver: async ({ request, locals }) => {
		const fd = await request.formData();
		const name = text(fd, 'name', 60);
		if (!name) return fail(400, { person: bad('Enter a name.') });
		renameDriver(locals.user!.id, Number(fd.get('driverId')), name);
	},

	deleteDriver: async ({ request, locals }) => {
		deleteDriver(locals.user!.id, Number((await request.formData()).get('driverId')));
	},

	addItem: async ({ request, locals }) => {
		const fd = await request.formData();
		const driverId = Number(fd.get('driverId'));
		const { data, error } = readDriverItemForm(fd);
		if (error) return fail(400, { item: { ...bad(error, values(fd)), driverId } });
		if (!addDriverItem(locals.user!.id, driverId, data)) return fail(404, { item: { ...bad('Person not found.'), driverId } });
		return { item: { ...ok('Added.'), driverId } };
	},

	updateItem: async ({ request, locals }) => {
		const fd = await request.formData();
		const itemId = Number(fd.get('itemId'));
		const { data, error } = readDriverItemForm(fd);
		if (error) return fail(400, { edit: { ...bad(error, values(fd)), itemId } });
		if (!updateDriverItem(locals.user!.id, itemId, data)) return fail(404, { edit: { ...bad('Not found.'), itemId } });
		return { edit: { ...ok('Saved.'), itemId } };
	},

	renewItem: async ({ request, locals }) => {
		const fd = await request.formData();
		const itemId = Number(fd.get('itemId'));
		const next = renewDriverItem(locals.user!.id, itemId, date(fd, 'due_date'));
		if (!next) return fail(404, { edit: { ...bad('That renewal couldn’t be found.'), itemId } });
		return { edit: { ...ok(`Renewed. Next due ${formatDate(next)}.`), itemId } };
	},

	deleteItem: async ({ request, locals }) => {
		deleteDriverItem(locals.user!.id, Number((await request.formData()).get('itemId')));
	}
};
