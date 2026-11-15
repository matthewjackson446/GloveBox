import { fail } from '@sveltejs/kit';
import {
	MIN_PASSWORD_LENGTH,
	deleteUserSessions,
	hashPassword,
	isValidEmail,
	normaliseEmail,
	verifyPassword
} from '$lib/server/auth';
import { db } from '$lib/server/db';
import { bad, ok, text, values } from '$lib/server/form';
import {
	createChannel,
	deleteChannel,
	deliver,
	getChannel,
	listChannels,
	parseChannelForm,
	setChannelEnabled,
	summarise
} from '$lib/server/notify/channels';
import { DAY_CHOICES, buildMessage, parseDays, pendingReminders } from '$lib/server/notify/reminders';
import { getSmtp, publicUrl } from '$lib/server/settings';
import { calendarToken, disableCalendar, resetCalendarToken } from '$lib/server/calendar';
import { appVersion } from '$lib/server/version';
import {
	beginSetup,
	checkSecondFactor,
	disable as disableTotp,
	enable as enableTotp,
	otpauthUri,
	qrSvg,
	recoveryLeft,
	regenerateRecovery,
	totpState,
	verifyCode
} from '$lib/server/totp';
import type { Contact } from '$lib/types';
import type { Actions, PageServerLoad } from './$types';

interface ReminderPrefs {
	reminders_enabled: number;
	reminder_days: string;
	remind_overdue: number;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const token = calendarToken(locals.user!.id);
	const base = (publicUrl() ?? url.origin).replace(/\/+$/, '');
	const userId = locals.user!.id;
	const contacts = db()
		.prepare('SELECT * FROM contacts WHERE user_id = ? ORDER BY id')
		.all(userId) as Contact[];
	const prefs = db()
		.prepare('SELECT reminders_enabled, reminder_days, remind_overdue FROM users WHERE id = ?')
		.get(userId) as ReminderPrefs;
	// Two-factor: off, being set up (secret saved, not yet confirmed), or on.
	const t = totpState(userId);
	const settingUp = !!t.totp_secret && !t.totp_enabled;
	const security = {
		enabled: t.totp_enabled === 1,
		recoveryLeft: recoveryLeft(t),
		setup: settingUp
			? { secret: t.totp_secret!.replace(/(.{4})/g, '$1 ').trim(), qr: await qrSvg(otpauthUri(t.totp_secret!, locals.user!.email)) }
			: null,
		justUsedRecovery: url.searchParams.get('recovery') === 'used'
	};

	return {
		security,
		contacts,
		reminders: {
			enabled: prefs.reminders_enabled === 1,
			days: parseDays(prefs.reminder_days),
			overdue: prefs.remind_overdue === 1,
			choices: [...DAY_CHOICES]
		},
		channels: listChannels(userId).map(summarise),
		emailAvailable: getSmtp() !== null,
		version: appVersion(),
		calendar: {
			url: token ? `${base}/calendar/${token}.ics` : null,
			// Calendar apps fetch from the internet, so a LAN-only address only works at home.
			publicUrlSet: publicUrl() !== null
		}
	};
};

export const actions: Actions = {
	totpBegin: async ({ locals }) => {
		if (totpState(locals.user!.id).totp_enabled) return fail(400, { security: bad('Two-factor sign-in is already on.') });
		beginSetup(locals.user!.id);
	},

	totpCancel: async ({ locals }) => {
		if (!totpState(locals.user!.id).totp_enabled) disableTotp(locals.user!.id);
	},

	totpConfirm: async ({ locals, request }) => {
		const t = totpState(locals.user!.id);
		if (!t.totp_secret || t.totp_enabled) return fail(400, { security: bad('Start the setup again.') });
		const step = verifyCode(t.totp_secret, text(await request.formData(), 'code', 10) ?? '', null);
		if (step === null)
			return fail(400, { security: bad('That code didn’t match. Check your phone’s clock is right and enter the current code.') });
		const codes = enableTotp(locals.user!.id, step);
		// Other devices must now sign in with a code too.
		deleteUserSessions(locals.user!.id, locals.sessionToken);
		return { recoveryCodes: codes, security: ok('Two-factor sign-in is on. Other devices have been signed out.') };
	},

	totpRegenerate: async ({ locals, request }) => {
		const code = text(await request.formData(), 'code', 20) ?? '';
		if (!checkSecondFactor(locals.user!.id, code).ok)
			return fail(400, { security: bad('Enter a current code from your authenticator app (or a recovery code).') });
		return { recoveryCodes: regenerateRecovery(locals.user!.id), security: ok('New recovery codes created. The old ones no longer work.') };
	},

	totpDisable: async ({ locals, request }) => {
		const fd = await request.formData();
		const row = db().prepare('SELECT password_hash FROM users WHERE id = ?').get(locals.user!.id) as { password_hash: string };
		if (!(await verifyPassword((fd.get('password') as string | null) ?? '', row.password_hash)))
			return fail(400, { security: bad('Your password is incorrect.') });
		if (!checkSecondFactor(locals.user!.id, text(fd, 'code', 20) ?? '').ok)
			return fail(400, { security: bad('Enter a current code from your authenticator app (or a recovery code).') });
		disableTotp(locals.user!.id);
		return { security: ok('Two-factor sign-in is off.') };
	},

	calendarReset: async ({ locals }) => {
		resetCalendarToken(locals.user!.id);
		return { calendarMsg: ok('New calendar link created. Any old link has stopped working.') };
	},

	calendarDisable: async ({ locals }) => {
		disableCalendar(locals.user!.id);
		return { calendarMsg: ok('Calendar link turned off.') };
	},

	reminderPrefs: async ({ request, locals }) => {
		const fd = await request.formData();
		const days = parseDays(fd.getAll('days').join(','));
		const enabled = fd.get('enabled') === 'on';
		if (enabled && days.length === 0 && fd.get('overdue') !== 'on')
			return fail(400, { reminders: bad('Pick at least one reminder time.') });
		db()
			.prepare('UPDATE users SET reminders_enabled = ?, reminder_days = ?, remind_overdue = ? WHERE id = ?')
			.run(enabled ? 1 : 0, days.join(','), fd.get('overdue') === 'on' ? 1 : 0, locals.user!.id);
		return { reminders: ok('Reminder settings saved.') };
	},

	addChannel: async ({ request, locals }) => {
		const fd = await request.formData();
		const parsed = parseChannelForm(fd);
		if ('error' in parsed) return fail(400, { channel: bad(parsed.error, values(fd)) });
		createChannel(locals.user!.id, parsed.type, parsed.name, parsed.config);
		return { channel: ok(`${parsed.name} added. Send a test to check it works.`) };
	},

	testChannel: async ({ request, locals }) => {
		const id = Number((await request.formData()).get('id'));
		const channel = getChannel(id, locals.user!.id);
		if (!channel) return fail(404, { channelRow: bad('Channel not found.') });

		// Send a real preview of what's coming up, or a simple test if nothing is due.
		const user = db()
			.prepare('SELECT id, name, reminders_enabled, reminder_days, remind_overdue FROM users WHERE id = ?')
			.get(locals.user!.id) as Parameters<typeof pendingReminders>[0];
		const pending = pendingReminders({ ...user, reminder_days: '60,30,14,7,3,1', remind_overdue: 1 });
		const message = pending.length
			? { ...buildMessage(pending), title: `[Test] ${buildMessage(pending).title}` }
			: {
					title: 'Glovebox test notification',
					text: 'If you can read this, reminders will reach you here. Nothing is due in the next 60 days.'
				};
		const result = await deliver(channel, message);
		return result.ok
			? { channelRow: ok(`Test sent to ${channel.name}.`) }
			: fail(502, { channelRow: bad(`${channel.name}: ${result.error}`) });
	},

	toggleChannel: async ({ request, locals }) => {
		const fd = await request.formData();
		setChannelEnabled(Number(fd.get('id')), locals.user!.id, fd.get('enabled') === 'true');
	},

	deleteChannel: async ({ request, locals }) => {
		deleteChannel(Number((await request.formData()).get('id')), locals.user!.id);
	},

	profile: async ({ request, locals }) => {
		const fd = await request.formData();
		const name = text(fd, 'name', 80);
		const email = normaliseEmail(text(fd, 'email', 254) ?? '');
		if (!name) return fail(400, { profile: bad('Enter your name.') });
		if (!isValidEmail(email)) return fail(400, { profile: bad('Enter a valid email address.') });
		const taken = db()
			.prepare('SELECT 1 FROM users WHERE email = ? AND id != ?')
			.get(email, locals.user!.id);
		if (taken) return fail(400, { profile: bad('Another account already uses that email.') });
		db().prepare('UPDATE users SET name = ?, email = ? WHERE id = ?').run(name, email, locals.user!.id);
		return { profile: ok('Profile saved.') };
	},

	password: async ({ request, locals }) => {
		const fd = await request.formData();
		const current = (fd.get('current') as string | null) ?? '';
		const next = (fd.get('password') as string | null) ?? '';
		const confirm = (fd.get('confirm') as string | null) ?? '';
		const row = db().prepare('SELECT password_hash FROM users WHERE id = ?').get(locals.user!.id) as {
			password_hash: string;
		};
		if (!(await verifyPassword(current, row.password_hash)))
			return fail(400, { password: bad('Your current password is incorrect.') });
		if (next.length < MIN_PASSWORD_LENGTH)
			return fail(400, { password: bad(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`) });
		if (next !== confirm) return fail(400, { password: bad('New passwords don’t match.') });
		db()
			.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
			.run(await hashPassword(next), locals.user!.id);
		deleteUserSessions(locals.user!.id, locals.sessionToken);
		return { password: ok('Password changed. Other devices have been signed out.') };
	},

	addContact: async ({ request, locals }) => {
		const fd = await request.formData();
		const name = text(fd, 'name', 80);
		const phone = text(fd, 'phone', 40);
		const relationship = text(fd, 'relationship', 40);
		if (!name || !phone) return fail(400, { contact: bad('Name and phone number are required.') });
		db()
			.prepare('INSERT INTO contacts (user_id, name, relationship, phone) VALUES (?, ?, ?, ?)')
			.run(locals.user!.id, name, relationship, phone);
		return { contact: ok('Contact added.') };
	},

	deleteContact: async ({ request, locals }) => {
		const fd = await request.formData();
		db()
			.prepare('DELETE FROM contacts WHERE id = ? AND user_id = ?')
			.run(Number(fd.get('id')), locals.user!.id);
	}
};
