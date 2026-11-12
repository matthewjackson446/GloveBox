import { db } from './db';

/** Server-wide key/value settings (admin-only). */

export function getSetting(key: string): string | null {
	const row = db().prepare('SELECT value FROM settings WHERE key = ?').get(key) as
		| { value: string }
		| undefined;
	return row?.value ?? null;
}

/** Set several settings at once; `null` removes a key. */
export function setSettings(values: Record<string, string | null>) {
	const conn = db();
	const upsert = conn.prepare(
		'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value'
	);
	const remove = conn.prepare('DELETE FROM settings WHERE key = ?');
	conn.transaction(() => {
		for (const [k, v] of Object.entries(values)) {
			if (v === null) remove.run(k);
			else upsert.run(k, v);
		}
	})();
}

export type SmtpSecurity = 'starttls' | 'tls' | 'none';

export interface SmtpConfig {
	host: string;
	port: number;
	security: SmtpSecurity;
	user: string | null;
	pass: string | null;
	from: string;
}

/** SMTP settings, or null if email isn't configured. */
export function getSmtp(): SmtpConfig | null {
	const host = getSetting('smtp_host');
	const from = getSetting('smtp_from');
	if (!host || !from) return null;
	const security = (getSetting('smtp_security') ?? 'starttls') as SmtpSecurity;
	return {
		host,
		port: Number(getSetting('smtp_port')) || (security === 'tls' ? 465 : 587),
		security,
		user: getSetting('smtp_user'),
		pass: getSetting('smtp_pass'),
		from
	};
}

/** Public base URL used for links in notifications, e.g. https://glovebox.example.com */
export function publicUrl(): string | null {
	return getSetting('public_url');
}

export const DEFAULT_REMINDER_HOUR = 9;

/** Local hour (0–23, container TZ) at which the daily reminder run happens. */
export function reminderHour(): number {
	const h = Number(getSetting('reminder_hour'));
	return Number.isInteger(h) && h >= 0 && h <= 23 && getSetting('reminder_hour') !== null
		? h
		: DEFAULT_REMINDER_HOUR;
}
