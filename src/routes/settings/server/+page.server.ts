import { error, fail } from '@sveltejs/kit';
import { formatDate } from '$lib/format';
import { db } from '$lib/server/db';
import { bad, int, ok, text, values } from '$lib/server/form';
import {
	DEFAULT_DVSA_SCOPE,
	LookupError,
	dvlaConfigured,
	dvlaLookup,
	dvsaConfigured,
	dvsaLookup
} from '$lib/server/lookup/clients';
import { sendTestEmail } from '$lib/server/notify/channels';
import { runReminders } from '$lib/server/notify/reminders';
import { LAST_RUN_KEY } from '$lib/server/notify/scheduler';
import {
	DEFAULT_REMINDER_HOUR,
	envSmtpSummary,
	getSetting,
	getSmtp,
	publicUrl,
	reminderHour,
	setSettings,
	smtpFromEnv,
	type SmtpSecurity
} from '$lib/server/settings';
import type { Actions, PageServerLoad } from './$types';

function requireAdmin(locals: App.Locals) {
	if (locals.user?.role !== 'admin') error(403, 'Only admins can change server settings');
	return locals.user;
}

export const load: PageServerLoad = ({ locals }) => {
	requireAdmin(locals);
	return {
		smtp: {
			host: getSetting('smtp_host') ?? '',
			port: getSetting('smtp_port') ?? '',
			security: (getSetting('smtp_security') ?? 'starttls') as SmtpSecurity,
			user: getSetting('smtp_user') ?? '',
			hasPassword: !!getSetting('smtp_pass'),
			from: getSetting('smtp_from') ?? ''
		},
		emailConfigured: getSmtp() !== null,
		// When set via container variables, SMTP is shown read-only here.
		smtpEnv: smtpFromEnv() ? envSmtpSummary() : null,
		publicUrl: publicUrl() ?? '',
		reminderHour: reminderHour(),
		lastRun: getSetting(LAST_RUN_KEY),
		timezone: process.env.TZ ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
		lookups: {
			dvla: { configured: dvlaConfigured() },
			dvsa: {
				configured: dvsaConfigured(),
				clientId: getSetting('dvsa_client_id') ?? '',
				hasSecret: !!getSetting('dvsa_client_secret'),
				hasApiKey: !!getSetting('dvsa_api_key'),
				tokenUrl: getSetting('dvsa_token_url') ?? '',
				scope: getSetting('dvsa_scope') ?? DEFAULT_DVSA_SCOPE
			},
			testReg:
				(
					db()
						.prepare(
							`SELECT v.registration FROM vehicles v JOIN vehicle_users vu ON vu.vehicle_id = v.id
							 WHERE vu.user_id = ? ORDER BY v.id LIMIT 1`
						)
						.get(locals.user!.id) as { registration: string } | undefined
				)?.registration ?? ''
		}
	};
};

/** Secret fields: blank keeps the saved value, the "remove" box clears it. */
function secret(fd: FormData, field: string, key: string): Record<string, string | null> {
	if (fd.get(`clear_${field}`) === 'on') return { [key]: null };
	const v = ((fd.get(field) as string | null) ?? '').trim();
	return v ? { [key]: v } : {};
}

const SECURITY: SmtpSecurity[] = ['starttls', 'tls', 'none'];

export const actions: Actions = {
	save: async ({ request, locals }) => {
		requireAdmin(locals);
		const fd = await request.formData();
		const err = (m: string) => fail(400, { save: bad(m, values(fd)) });

		const envManaged = smtpFromEnv();
		const host = text(fd, 'smtp_host', 200);
		const from = text(fd, 'smtp_from', 200);
		const user = text(fd, 'smtp_user', 200);
		const port = int(fd, 'smtp_port');
		const security = SECURITY.includes(fd.get('smtp_security') as SmtpSecurity)
			? (fd.get('smtp_security') as SmtpSecurity)
			: 'starttls';
		if (!envManaged) {
			if (host && !from) return err('Enter a “From” address for emails.');
			if (port !== null && (port < 1 || port > 65535)) return err('SMTP port must be 1–65535.');
		}

		let url = text(fd, 'public_url', 300);
		if (url) {
			try {
				const u = new URL(url);
				if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error();
				url = u.toString().replace(/\/+$/, '');
			} catch {
				return err('Public URL must start with http:// or https://');
			}
		}

		const hour = int(fd, 'reminder_hour') ?? DEFAULT_REMINDER_HOUR;
		if (hour < 0 || hour > 23) return err('Reminder time must be between 00:00 and 23:00.');

		// Password: blank keeps the saved one; the "clear" box removes it.
		const pass = (fd.get('smtp_pass') as string | null) ?? '';
		const passUpdate: Record<string, string | null> =
			fd.get('clear_pass') === 'on' ? { smtp_pass: null } : pass ? { smtp_pass: pass } : {};

		// Catch the password box being filled with the username (e.g. by a browser's autofill).
		const effectivePass = fd.get('clear_pass') === 'on' ? null : pass || getSetting('smtp_pass');
		if (!envManaged && user && effectivePass && effectivePass.trim() === user.trim())
			return err('The SMTP password is the same as the username. Your browser may have filled it in. Paste the real password (for SMTP2GO, the SMTP user’s password).');

		setSettings({
			// Container variables own SMTP when set; only save the other settings then.
			...(envManaged
				? {}
				: {
						smtp_host: host,
						smtp_port: port === null ? null : String(port),
						smtp_security: security,
						smtp_user: user,
						smtp_from: from,
						...passUpdate
					}),
			public_url: url,
			reminder_hour: String(hour)
		});
		return { save: ok('Server settings saved.') };
	},

	testEmail: async ({ locals }) => {
		const me = requireAdmin(locals);
		if (!getSmtp()) return fail(400, { test: bad('Save SMTP settings first.') });
		try {
			await sendTestEmail(me.email, {
				title: 'Glovebox test email',
				text: 'Your Glovebox SMTP settings work. Reminder emails will be sent from this address.'
			});
			return { test: ok(`Test email sent to ${me.email}.`) };
		} catch (e) {
			return fail(502, { test: bad(`Couldn’t send: ${(e as Error).message}`) });
		}
	},

	saveLookups: async ({ request, locals }) => {
		requireAdmin(locals);
		const fd = await request.formData();
		// Each service has its own form; only touch the settings of the one submitted.
		if (fd.get('service') === 'dvla') {
			const update = secret(fd, 'dvla_api_key', 'dvla_api_key');
			if (Object.keys(update).length === 0)
				return fail(400, { lookups: bad('Paste your DVLA API key first.'), lookupsService: 'dvla' });
			setSettings(update);
			return {
				lookups: ok(update.dvla_api_key === null ? 'DVLA key removed.' : 'DVLA key saved. Use “Test DVLA” below to check it.'),
				lookupsService: 'dvla'
			};
		}

		const tokenUrl = text(fd, 'dvsa_token_url', 300);
		// Real token URLs are always https; localhost is allowed for testing against a mock.
		if (tokenUrl && !/^(https:\/\/|http:\/\/(localhost|127\.0\.0\.1)[:/])/.test(tokenUrl))
			return fail(400, { lookups: bad('The DVSA token URL should start with https://'), lookupsService: 'dvsa' });
		setSettings({
			dvsa_client_id: text(fd, 'dvsa_client_id', 200),
			...secret(fd, 'dvsa_client_secret', 'dvsa_client_secret'),
			...secret(fd, 'dvsa_api_key', 'dvsa_api_key'),
			dvsa_token_url: tokenUrl,
			dvsa_scope: text(fd, 'dvsa_scope', 200) ?? DEFAULT_DVSA_SCOPE
		});
		return { lookups: ok('DVSA details saved. Use “Test DVSA” below to check them.'), lookupsService: 'dvsa' };
	},

	testLookup: async ({ request, locals }) => {
		requireAdmin(locals);
		const fd = await request.formData();
		const service = fd.get('service');
		const reg = text(fd, 'reg', 16);
		if (!reg) return fail(400, { lookupTest: bad('Enter a registration to test with.') });
		try {
			if (service === 'dvla') {
				const r = await dvlaLookup(reg);
				return {
					lookupTest: ok(
						r
							? `DVLA works: ${[r.colour, r.make].filter(Boolean).join(' ')}, tax ${r.taxStatus ?? 'unknown'}${r.taxDueDate ? ` (due ${formatDate(r.taxDueDate)})` : ''}, MOT ${r.motStatus ?? 'unknown'}${r.motExpiry ? ` (expires ${formatDate(r.motExpiry)})` : ''}.`
							: 'DVLA works, but has no record of that registration.'
					)
				};
			}
			const r = await dvsaLookup(reg);
			return {
				lookupTest: ok(
					r
						? `DVSA works: ${[r.make, r.model].filter(Boolean).join(' ')}, ${r.motTests?.length ?? 0} MOT test(s) on record.`
						: 'DVSA works, but has no MOT record for that registration (it may be too new).'
				)
			};
		} catch (e) {
			return fail(502, { lookupTest: bad(e instanceof LookupError ? e.message : `Test failed: ${(e as Error).message}`) });
		}
	},

	runNow: async ({ locals }) => {
		requireAdmin(locals);
		const s = await runReminders();
		const msg =
			s.reminders === 0
				? 'Nothing new to send. Everyone’s up to date (or has no channels set up).'
				: `Sent ${s.reminders} reminder${s.reminders === 1 ? '' : 's'} to ${s.users} user${s.users === 1 ? '' : 's'}: ${s.delivered} delivered${s.failed ? `, ${s.failed} channel(s) failed` : ''}.`;
		return { run: s.failed && !s.delivered ? bad(msg) : ok(msg) };
	}
};
