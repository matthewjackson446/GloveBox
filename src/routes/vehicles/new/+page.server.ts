import { fail, redirect } from '@sveltejs/kit';
import { text, values } from '$lib/server/form';
import { lookupRegistration, lookupsConfigured, syncVehicle } from '$lib/server/lookup/sync';
import { db } from '$lib/server/db';
import { createVehicle, readVehicleForm } from '$lib/server/vehicles';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({ lookupsEnabled: lookupsConfigured() });

export const actions: Actions = {
	/** "Look up" button: fill the form from DVLA/DVSA without saving anything. */
	lookup: async ({ request }) => {
		const fd = await request.formData();
		const reg = text(fd, 'registration', 16);
		const typed = values(fd);
		if (!reg) return fail(400, { error: 'Enter a registration to look up.', values: typed });
		if (!lookupsConfigured()) return fail(400, { error: 'Lookups aren’t set up on this server.', values: typed });

		const r = await lookupRegistration(reg);
		if (!r.found) {
			return fail(r.errors.length ? 502 : 404, {
				error: r.errors.join(' ') || `No vehicle found for ${reg.toUpperCase()}. Check the registration, or enter the details by hand.`,
				values: typed
			});
		}
		// Looked-up values fill the form, but anything the user already typed wins.
		const merged = { ...r.values };
		for (const [k, v] of Object.entries(typed)) if (v.trim()) merged[k] = v;
		return { lookup: { facts: r.facts, warnings: r.errors }, values: merged };
	},

	create: async ({ request, locals }) => {
		const fd = await request.formData();
		const { data, error } = readVehicleForm(fd);
		if (error) return fail(400, { error, values: values(fd) });
		const id = createVehicle(locals.user!.id, data);

		if (lookupsConfigured()) {
			const autoSync = fd.get('auto_sync') === 'on';
			db().prepare('UPDATE vehicles SET auto_sync = ? WHERE id = ?').run(autoSync ? 1 : 0, id);
			// Pull tax/MOT dates and MOT history straight away. Errors are shown on the vehicle page.
			if (autoSync) await syncVehicle(id);
		}
		redirect(303, `/vehicles/${id}`);
	}
};
