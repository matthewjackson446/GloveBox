import { randomBytes } from 'node:crypto';
import { ITEM_TYPES, itemTitle } from '$lib/items';
import type { DueItem } from '$lib/types';
import { db } from './db';
import { publicUrl } from './settings';

/* ---------- tokens ---------- */

/** The secret in a user's calendar link. Anyone with the link can read the feed, so it can be reset. */
export function calendarToken(userId: number): string | null {
	const row = db().prepare('SELECT calendar_token FROM users WHERE id = ?').get(userId) as
		| { calendar_token: string | null }
		| undefined;
	return row?.calendar_token ?? null;
}

/** Create a new link, replacing (and so invalidating) any old one. */
export function resetCalendarToken(userId: number): string {
	const token = randomBytes(24).toString('base64url');
	db().prepare('UPDATE users SET calendar_token = ? WHERE id = ?').run(token, userId);
	return token;
}

export function disableCalendar(userId: number) {
	db().prepare('UPDATE users SET calendar_token = NULL WHERE id = ?').run(userId);
}

export function userForToken(token: string): { id: number } | undefined {
	if (!/^[\w-]{20,64}$/.test(token)) return undefined;
	return db().prepare('SELECT id FROM users WHERE calendar_token = ?').get(token) as { id: number } | undefined;
}

/* ---------- iCalendar (RFC 5545) ---------- */

type FeedItem = DueItem & { registration: string; nickname: string | null };

/** Event titles read naturally in a calendar: "AB12 CDE: MOT expires". "Other" items use their own name. */
const EVENT_TITLES: Record<string, string> = {
	mot: 'MOT expires',
	tax: 'Road tax due',
	insurance: 'Insurance renewal',
	service: 'Service due',
	breakdown: 'Breakdown cover renewal',
	warranty: 'Warranty expires',
	finance: 'Finance ends'
};

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Lines must be folded at 75 octets (not characters), continuing with a space. */
function fold(line: string): string {
	const out: string[] = [];
	let cur = '';
	let bytes = 0;
	for (const ch of line) {
		const n = Buffer.byteLength(ch);
		if (bytes + n > (out.length ? 74 : 75)) {
			out.push(cur);
			cur = '';
			bytes = 0;
		}
		cur += ch;
		bytes += n;
	}
	out.push(cur);
	return out.join('\r\n ');
}

const ymd = (iso: string) => iso.replace(/-/g, '');

function nextDay(iso: string): string {
	const [y, m, d] = iso.split('-').map(Number);
	return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

function stamp(d = new Date()): string {
	return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export function buildCalendar(userId: number, base = publicUrl()): string {
	const items = db()
		.prepare(
			`SELECT d.*, v.registration, v.nickname FROM due_items d
			 JOIN vehicles v ON v.id = d.vehicle_id
			 JOIN vehicle_users vu ON vu.vehicle_id = v.id
			 WHERE vu.user_id = ? AND v.archived = 0 AND d.due_date IS NOT NULL
			 ORDER BY d.due_date`
		)
		.all(userId) as FeedItem[];

	const now = stamp();
	const link = (vehicleId: number) => (base ? `${base.replace(/\/+$/, '')}/vehicles/${vehicleId}` : null);

	const lines = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//Glovebox//Vehicle reminders//EN',
		'CALSCALE:GREGORIAN',
		'METHOD:PUBLISH',
		'X-WR-CALNAME:Glovebox',
		'X-WR-CALDESC:MOT\\, tax\\, insurance and other renewals from Glovebox',
		'REFRESH-INTERVAL;VALUE=DURATION:PT6H',
		'X-PUBLISHED-TTL:PT6H'
	];

	for (const i of items) {
		const def = ITEM_TYPES[i.type];
		const what = EVENT_TITLES[i.type] ?? `${itemTitle(i)} due`;
		const vehicle = i.nickname ? `${i.registration} (${i.nickname})` : i.registration;
		const details = [
			i.provider && `${def?.fields.provider ?? 'Provider'}: ${i.provider}`,
			i.reference && `${def?.fields.reference ?? 'Reference'}: ${i.reference}`,
			i.emergency_phone && `${def?.fields.emergency_phone ?? 'Emergency'}: ${i.emergency_phone}`,
			i.phone && `${def?.fields.phone ?? 'Phone'}: ${i.phone}`,
			i.due_mileage != null && `Or at ${i.due_mileage.toLocaleString('en-GB')} miles`,
			link(i.vehicle_id) && `Open in Glovebox: ${link(i.vehicle_id)}`
		].filter(Boolean) as string[];
		const url = link(i.vehicle_id);

		lines.push(
			'BEGIN:VEVENT',
			// Stable per item, so moving the date updates the same event rather than adding one.
			`UID:glovebox-item-${i.id}@glovebox`,
			`DTSTAMP:${now}`,
			`LAST-MODIFIED:${stamp(new Date(i.updated_at.replace(' ', 'T') + 'Z'))}`,
			`DTSTART;VALUE=DATE:${ymd(i.due_date!)}`,
			`DTEND;VALUE=DATE:${ymd(nextDay(i.due_date!))}`,
			`SUMMARY:${esc(`${vehicle}: ${what}`)}`,
			...(details.length ? [`DESCRIPTION:${esc(details.join('\n'))}`] : []),
			...(url ? [`URL:${esc(url)}`] : []),
			'TRANSP:TRANSPARENT',
			'CATEGORIES:Glovebox',
			// One week's notice; Apple Calendar and Outlook honour this, Google ignores alarms in subscriptions.
			'BEGIN:VALARM',
			'ACTION:DISPLAY',
			`DESCRIPTION:${esc(`${vehicle}: ${what} in a week`)}`,
			'TRIGGER:-P7D',
			'END:VALARM',
			'END:VEVENT'
		);
	}
	lines.push('END:VCALENDAR');
	return lines.map(fold).join('\r\n') + '\r\n';
}
