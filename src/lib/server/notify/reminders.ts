import { formatDate, formatMiles } from '$lib/format';
import { itemTitle } from '$lib/items';
import { SOON_MILES, describeState, itemState, todayISO, type ItemState } from '$lib/status';
import type { DueItem } from '$lib/types';
import { db } from '../db';
import { publicUrl } from '../settings';
import { deliver, listChannels, type Message } from './channels';

/** Lead times users can pick from, in days. */
export const DAY_CHOICES = [60, 30, 14, 7, 3, 1] as const;

export interface ReminderUser {
	id: number;
	name: string;
	reminders_enabled: number;
	reminder_days: string;
	remind_overdue: number;
}

type ReminderItem = DueItem & {
	registration: string;
	nickname: string | null;
	vehicle_mileage: number | null;
};

export interface PendingReminder {
	item: ReminderItem;
	/** What the reminder is for: `d:<date>` or `m:<mileage>`. */
	dueKey: string;
	/** `30`, `7`, `overdue`, `miles-soon`, `miles-overdue`… */
	threshold: string;
	kind: 'date' | 'miles';
	state: ItemState;
}

export function parseDays(value: string): number[] {
	return [...new Set(value.split(',').map(Number))]
		.filter((n) => Number.isInteger(n) && n > 0 && n <= 365)
		.sort((a, b) => a - b);
}

/**
 * The single tightest threshold an item has crossed. E.g. with [1, 7, 14, 30] and 5 days
 * left that's "7": you get one reminder now and the next at 1 day, not a burst of 30/14/7.
 */
function dateThreshold(days: number, leadDays: number[], overdue: boolean): string | null {
	if (days < 0) return overdue ? 'overdue' : null;
	const t = leadDays.find((d) => days <= d);
	return t === undefined ? null : String(t);
}

function milesThreshold(milesLeft: number, overdue: boolean): string | null {
	if (milesLeft <= 0) return overdue ? 'miles-overdue' : null;
	return milesLeft <= SOON_MILES ? 'miles-soon' : null;
}

/** Reminders that are due for this user and haven't been sent yet. */
export function pendingReminders(user: ReminderUser, today = todayISO()): PendingReminder[] {
	const conn = db();
	const items = conn
		.prepare(
			`SELECT d.*, v.registration, v.nickname, v.mileage AS vehicle_mileage
			 FROM due_items d
			 JOIN vehicles v ON v.id = d.vehicle_id
			 JOIN vehicle_users vu ON vu.vehicle_id = v.id
			 WHERE vu.user_id = ? AND v.archived = 0`
		)
		.all(user.id) as ReminderItem[];
	const alreadySent = conn.prepare(
		'SELECT 1 FROM reminder_log WHERE user_id = ? AND item_id = ? AND due_key = ? AND threshold = ?'
	);

	const leadDays = parseDays(user.reminder_days);
	const overdue = user.remind_overdue === 1;
	const out: PendingReminder[] = [];

	for (const item of items) {
		const state = itemState(item, item.vehicle_mileage, today);
		const candidates: Omit<PendingReminder, 'item' | 'state'>[] = [];

		if (state.days !== null && item.due_date) {
			const threshold = dateThreshold(state.days, leadDays, overdue);
			if (threshold) candidates.push({ dueKey: `d:${item.due_date}`, threshold, kind: 'date' });
		}
		if (state.milesLeft !== null && item.due_mileage != null) {
			const threshold = milesThreshold(state.milesLeft, overdue);
			if (threshold) candidates.push({ dueKey: `m:${item.due_mileage}`, threshold, kind: 'miles' });
		}

		for (const c of candidates) {
			if (!alreadySent.get(user.id, item.id, c.dueKey, c.threshold)) out.push({ ...c, item, state });
		}
	}

	return out.sort((a, b) => urgency(a) - urgency(b));
}

function urgency(p: PendingReminder): number {
	if (p.kind === 'miles') return p.state.milesLeft! <= 0 ? -1 : 15; // treat ~1000 miles as ~2 weeks
	return p.state.days!;
}

/* ---------- message ---------- */

function vehicleLabel(i: ReminderItem) {
	return i.nickname ? `${i.registration} (${i.nickname})` : i.registration;
}

function detail(p: PendingReminder): string {
	const { item, state } = p;
	if (p.kind === 'miles') {
		const left = describeState({ status: state.status, days: null, milesLeft: state.milesLeft });
		return `due at ${formatMiles(item.due_mileage)} (${left.toLowerCase()})`;
	}
	const when = describeState({ status: state.status, days: state.days, milesLeft: null });
	return `${state.days! < 0 ? 'was due' : 'due'} ${formatDate(item.due_date)} (${when.toLowerCase()})`;
}

function headline(p: PendingReminder): string {
	const title = itemTitle(p.item);
	if (p.kind === 'miles') {
		return p.state.milesLeft! <= 0
			? `${title} is overdue`
			: `${title} due in ${p.state.milesLeft!.toLocaleString('en-GB')} miles`;
	}
	const d = p.state.days!;
	if (d < 0) return `${title} is overdue`;
	if (d === 0) return `${title} is due today`;
	return `${title} due in ${d} day${d === 1 ? '' : 's'}`;
}

const escapeHtml = (s: string) =>
	s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function buildMessage(pending: PendingReminder[], base = publicUrl()): Message {
	const url = base ? `${base.replace(/\/+$/, '')}/` : null;
	const urgent = pending.some((p) =>
		p.kind === 'miles' ? p.state.milesLeft! <= 0 : p.state.days! <= 7
	);
	const title =
		pending.length === 1
			? `${pending[0].item.registration}: ${headline(pending[0])}`
			: `Glovebox: ${pending.length} things need attention`;

	const lines = pending.map((p) => `• ${vehicleLabel(p.item)}: ${itemTitle(p.item)}, ${detail(p)}`);
	const text = lines.join('\n');

	const rows = pending
		.map((p) => {
			const overdue = p.state.status === 'overdue';
			return `<tr>
	<td style="padding:10px 12px;border-bottom:1px solid #e4e4e7;white-space:nowrap"><span style="background:#f7c600;color:#000;font-weight:900;padding:2px 6px;border-radius:4px;font-family:Arial Black,Arial,sans-serif;letter-spacing:.05em">${escapeHtml(p.item.registration)}</span></td>
	<td style="padding:10px 12px;border-bottom:1px solid #e4e4e7"><strong>${escapeHtml(itemTitle(p.item))}</strong>${p.item.nickname ? ` <span style="color:#71717a">· ${escapeHtml(p.item.nickname)}</span>` : ''}<br><span style="color:${overdue ? '#dc2626' : '#d97706'}">${escapeHtml(detail(p))}</span></td>
</tr>`;
		})
		.join('');
	const html = `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#18181b">
<div style="max-width:560px;margin:0 auto;padding:24px 16px">
<p style="font-size:18px;font-weight:600;margin:0 0 4px">${escapeHtml(title)}</p>
<p style="color:#71717a;margin:0 0 16px">Here’s what’s coming up on your vehicles.</p>
<table style="width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7">${rows}</table>
${url ? `<p style="margin:20px 0"><a href="${escapeHtml(url)}" style="background:#059669;color:#fff;text-decoration:none;padding:10px 16px;border-radius:10px;font-weight:600;display:inline-block">Open Glovebox</a></p>` : ''}
<p style="color:#a1a1aa;font-size:12px">You’re getting this because reminders are turned on in your Glovebox settings.</p>
</div></body></html>`;

	return { title, text, html, url, urgent };
}

/* ---------- the daily run ---------- */

export interface RunSummary {
	users: number;
	reminders: number;
	delivered: number;
	failed: number;
}

let running: Promise<RunSummary> | null = null;

/** Send every user their pending reminders. Concurrent calls share one run. */
export function runReminders(today = todayISO()): Promise<RunSummary> {
	running ??= doRun(today).finally(() => (running = null));
	return running;
}

async function doRun(today: string): Promise<RunSummary> {
	const conn = db();
	const users = conn
		.prepare(
			'SELECT id, name, reminders_enabled, reminder_days, remind_overdue FROM users WHERE reminders_enabled = 1'
		)
		.all() as ReminderUser[];
	const log = conn.prepare(
		'INSERT OR IGNORE INTO reminder_log (user_id, item_id, due_key, threshold) VALUES (?, ?, ?, ?)'
	);
	const summary: RunSummary = { users: 0, reminders: 0, delivered: 0, failed: 0 };

	for (const user of users) {
		const channels = listChannels(user.id).filter((c) => c.enabled);
		if (channels.length === 0) continue; // nothing logged, so they'll get these once they add a channel

		const pending = pendingReminders(user, today);
		if (pending.length === 0) continue;

		summary.users++;
		summary.reminders += pending.length;
		const message = buildMessage(pending);
		const results = await Promise.all(channels.map((c) => deliver(c, message)));
		const ok = results.filter((r) => r.ok).length;
		summary.delivered += ok;
		summary.failed += results.length - ok;

		// If every channel failed, don't mark as sent: the next run will retry.
		if (ok > 0) {
			conn.transaction(() => {
				for (const p of pending) log.run(user.id, p.item.id, p.dueKey, p.threshold);
			})();
		}
	}
	return summary;
}
