import { addYears, DRIVER_ITEM_TYPES, isDriverItemType } from '$lib/drivers';
import type { Driver, DriverItem } from '$lib/types';
import { db } from './db';
import { date, text } from './form';

export type DriverWithItems = Driver & { items: DriverItem[] };

/** The people this user tracks, each with their renewals (soonest first). */
export function listDrivers(userId: number): DriverWithItems[] {
	const conn = db();
	const drivers = conn.prepare('SELECT * FROM drivers WHERE user_id = ? ORDER BY id').all(userId) as Driver[];
	if (!drivers.length) return [];
	const items = conn
		.prepare(
			`SELECT * FROM driver_items WHERE driver_id IN (${drivers.map(() => '?').join(',')})
			 ORDER BY due_date IS NULL, due_date, id`
		)
		.all(...drivers.map((d) => d.id)) as DriverItem[];
	return drivers.map((d) => ({ ...d, items: items.filter((i) => i.driver_id === d.id) }));
}

export function addDriver(userId: number, name: string): number {
	return Number(db().prepare('INSERT INTO drivers (user_id, name) VALUES (?, ?)').run(userId, name).lastInsertRowid);
}

export function renameDriver(userId: number, driverId: number, name: string) {
	db().prepare('UPDATE drivers SET name = ? WHERE id = ? AND user_id = ?').run(name, driverId, userId);
}

export function deleteDriver(userId: number, driverId: number) {
	db().prepare('DELETE FROM drivers WHERE id = ? AND user_id = ?').run(driverId, userId);
}

const ownsDriver = (userId: number, driverId: number) =>
	!!db().prepare('SELECT 1 FROM drivers WHERE id = ? AND user_id = ?').get(driverId, userId);

/** The item, if it belongs to one of this user's drivers. */
export function getDriverItem(userId: number, itemId: number): DriverItem | undefined {
	return db()
		.prepare(
			`SELECT i.* FROM driver_items i JOIN drivers d ON d.id = i.driver_id
			 WHERE i.id = ? AND d.user_id = ?`
		)
		.get(itemId, userId) as DriverItem | undefined;
}

export interface DriverItemInput {
	type: string;
	label: string | null;
	due_date: string | null;
	reference: string | null;
	notes: string | null;
}

export function readDriverItemForm(fd: FormData): { data: DriverItemInput; error?: string } {
	const type = String(fd.get('type') ?? '');
	const data: DriverItemInput = {
		type,
		label: text(fd, 'label', 60),
		due_date: date(fd, 'due_date'),
		reference: text(fd, 'reference', 60),
		notes: text(fd, 'notes', 1000)
	};
	if (!isDriverItemType(type)) return { data, error: 'Choose what kind of renewal this is.' };
	if (type === 'other' && !data.label) return { data, error: 'Give it a name, e.g. “Taxi badge”.' };
	if (!data.due_date) return { data, error: 'Enter the expiry or due date.' };
	return { data };
}

export function addDriverItem(userId: number, driverId: number, d: DriverItemInput): boolean {
	if (!ownsDriver(userId, driverId)) return false;
	db()
		.prepare('INSERT INTO driver_items (driver_id, type, label, due_date, reference, notes) VALUES (?, ?, ?, ?, ?, ?)')
		.run(driverId, d.type, d.type === 'other' ? d.label : null, d.due_date, d.reference, d.notes);
	return true;
}

export function updateDriverItem(userId: number, itemId: number, d: DriverItemInput): boolean {
	const item = getDriverItem(userId, itemId);
	if (!item) return false;
	db()
		.prepare(
			`UPDATE driver_items SET type = ?, label = ?, due_date = ?, reference = ?, notes = ?, updated_at = datetime('now')
			 WHERE id = ?`
		)
		.run(d.type, d.type === 'other' ? d.label : null, d.due_date, d.reference, d.notes, itemId);
	return true;
}

/** Roll on by the type's usual period (or to a given date). Moving the date restarts its reminders. */
export function renewDriverItem(userId: number, itemId: number, newDate: string | null): string | null {
	const item = getDriverItem(userId, itemId);
	if (!item || !item.due_date) return null;
	const next = newDate ?? addYears(item.due_date, DRIVER_ITEM_TYPES[item.type]?.years ?? 1);
	db().prepare(`UPDATE driver_items SET due_date = ?, updated_at = datetime('now') WHERE id = ?`).run(next, itemId);
	return next;
}

export function deleteDriverItem(userId: number, itemId: number) {
	if (getDriverItem(userId, itemId)) db().prepare('DELETE FROM driver_items WHERE id = ?').run(itemId);
}
