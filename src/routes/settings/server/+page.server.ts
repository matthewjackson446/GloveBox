import { error, fail } from '@sveltejs/kit';
import { bad, int, ok, text, values } from '$lib/server/form';
import { sendTestEmail } from '$lib/server/notify/channels';
import { runReminders } from '$lib/server/notify/reminders';
import { LAST_RUN_KEY } from '$lib/server/notify/scheduler';
import {
	DEFAULT_REMINDER_HOUR,
	getSetting,
	getSmtp,
	publicUrl,
	reminderHour,
	setSettings,
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
		publicUrl: publicUrl() ?? '',
		reminderHour: reminderHour(),
		lastRun: getSetting(LAST_RUN_KEY),
		timezone: process.env.TZ ?? Intl.DateTimeFormat().resolvedOptions().timeZone
	};
};

const SECURITY: SmtpSecurity[] = ['starttls', 'tls', 'none'];

export const actions: Actions = {
	save: async ({ request, locals }) => {
		requireAdmin(locals);
		const fd = await request.formData();
		const err = (m: string) => fail(400, { save: bad(m, values(fd)) });

		const host = text(fd, 'smtp_host', 200);
		const from = text(fd, 'smtp_from', 200);
		const port = int(fd, 'smtp_port');
		const security = SECURITY.includes(fd.get('smtp_security') as SmtpSecurity)
			? (fd.get('smtp_security') as SmtpSecurity)
			: 'starttls';
		if (host && !from) return err('Enter a “From” address for emails.');
		if (port !== null && (port < 1 || port > 65535)) return err('SMTP port must be 1–65535.');

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

		setSettings({
			smtp_host: host,
			smtp_port: port === null ? null : String(port),
			smtp_security: security,
			smtp_user: text(fd, 'smtp_user', 200),
			smtp_from: from,
			...passUpdate,
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
