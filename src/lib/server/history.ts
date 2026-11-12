import { RECORD_KINDS } from '$lib/history';
import { todayISO } from '$lib/status';
import type { DueItem, ItemHistory, MileageReading, MotTest, ServiceRecord } from '$lib/types';
import { db } from './db';
import { date, int, money, text } from './form';

/* ---------- mileage ---------- */

/** Record a reading, and move the vehicle's current mileage up (never down). */
export function logMileage(vehicleId: number, mileage: number, on = todayISO()) {
	const conn = db();
	conn.prepare('INSERT INTO mileage_log (vehicle_id, date, mileage) VALUES (?, ?, ?)').run(vehicleId, on, mileage);
	conn
		.prepare(
			`UPDATE vehicles SET mileage = ?, updated_at = datetime('now') WHERE id = ? AND (mileage IS NULL OR mileage < ?)`
		)
		.run(mileage, vehicleId, mileage);
}

/** Every known reading: manual updates, service records and MOT tests (km converted to miles). */
export function mileageHistory(vehicleId: number): MileageReading[] {
	const conn = db();
	const manual = conn
		.prepare('SELECT date, mileage FROM mileage_log WHERE vehicle_id = ?')
		.all(vehicleId) as { date: string; mileage: number }[];
	const services = conn
		.prepare('SELECT date, mileage FROM service_records WHERE vehicle_id = ? AND mileage IS NOT NULL')
		.all(vehicleId) as { date: string; mileage: number }[];
	const mots = conn
		.prepare('SELECT completed_at, odometer, odometer_unit FROM mot_tests WHERE vehicle_id = ? AND odometer IS NOT NULL')
		.all(vehicleId) as Pick<MotTest, 'completed_at' | 'odometer' | 'odometer_unit'>[];

	const all: MileageReading[] = [
		...manual.map((r) => ({ ...r, source: 'manual' as const })),
		...services.map((r) => ({ ...r, source: 'service' as const })),
		...mots.map((t) => ({
			date: t.completed_at.slice(0, 10),
			mileage: t.odometer_unit?.toUpperCase().startsWith('K') ? Math.round(t.odometer! * 0.621371) : t.odometer!,
			source: 'mot' as const
		}))
	];
	const seen = new Set<string>();
	return all
		.filter((r) => {
			const k = `${r.date}|${r.mileage}`;
			return seen.has(k) ? false : (seen.add(k), true);
		})
		.sort((a, b) => b.date.localeCompare(a.date) || b.mileage - a.mileage);
}

/* ---------- service records ---------- */

export type RecordInput = Pick<ServiceRecord, 'date' | 'kind' | 'title' | 'mileage' | 'garage' | 'cost' | 'notes'>;

export function readRecordForm(fd: FormData): { data: RecordInput; error?: string } {
	const kind = Object.hasOwn(RECORD_KINDS, String(fd.get('kind'))) ? String(fd.get('kind')) : 'service';
	const data: RecordInput = {
		date: date(fd, 'date') ?? '',
		kind,
		title: text(fd, 'title', 120) ?? RECORD_KINDS[kind],
		mileage: int(fd, 'mileage'),
		garage: text(fd, 'garage', 120),
		cost: money(fd, 'cost'),
		notes: text(fd, 'notes', 5000)
	};
	if (!data.date) return { data, error: 'Enter the date of the work.' };
	if (data.date > todayISO()) return { data, error: 'That date is in the future. Use Renewals & due dates for upcoming work.' };
	if (data.mileage !== null && data.mileage < 0) return { data, error: 'Mileage can’t be negative.' };
	return { data };
}

export function listRecords(vehicleId: number): ServiceRecord[] {
	return db()
		.prepare('SELECT * FROM service_records WHERE vehicle_id = ? ORDER BY date DESC, id DESC')
		.all(vehicleId) as ServiceRecord[];
}

export function getRecord(vehicleId: number, recordId: number): ServiceRecord | undefined {
	return db()
		.prepare('SELECT * FROM service_records WHERE id = ? AND vehicle_id = ?')
		.get(recordId, vehicleId) as ServiceRecord | undefined;
}

export function createRecord(vehicleId: number, userId: number, data: RecordInput): number {
	const r = db()
		.prepare(
			`INSERT INTO service_records (vehicle_id, date, kind, title, mileage, garage, cost, notes, created_by)
			 VALUES (@vehicle_id, @date, @kind, @title, @mileage, @garage, @cost, @notes, @created_by)`
		)
		.run({ ...data, vehicle_id: vehicleId, created_by: userId });
	if (data.mileage != null) bumpMileage(vehicleId, data.mileage);
	return Number(r.lastInsertRowid);
}

export function updateRecord(vehicleId: number, recordId: number, data: RecordInput) {
	db()
		.prepare(
			`UPDATE service_records SET date = @date, kind = @kind, title = @title, mileage = @mileage,
			 garage = @garage, cost = @cost, notes = @notes, updated_at = datetime('now') WHERE id = @id`
		)
		.run({ ...data, id: recordId });
	if (data.mileage != null) bumpMileage(vehicleId, data.mileage);
}

export function deleteRecord(recordId: number) {
	db().prepare('DELETE FROM service_records WHERE id = ?').run(recordId);
}

function bumpMileage(vehicleId: number, mileage: number) {
	db()
		.prepare(`UPDATE vehicles SET mileage = ? WHERE id = ? AND (mileage IS NULL OR mileage < ?)`)
		.run(mileage, vehicleId, mileage);
}

/** Spend from service history: last 12 months and all time. */
export function spending(vehicleId: number) {
	const yearAgo = new Date();
	yearAgo.setFullYear(yearAgo.getFullYear() - 1);
	const row = db()
		.prepare(
			`SELECT COALESCE(SUM(cost), 0) AS allTime,
			        COALESCE(SUM(CASE WHEN date >= ? THEN cost END), 0) AS lastYear
			 FROM service_records WHERE vehicle_id = ?`
		)
		.get(todayISO(yearAgo), vehicleId) as { allTime: number; lastYear: number };
	return row;
}

/* ---------- renewals ---------- */

export type RenewInput = Pick<DueItem, 'provider' | 'reference' | 'start_date' | 'due_date' | 'cost' | 'excess' | 'notes'>;

export function readRenewForm(fd: FormData): { data: RenewInput; error?: string } {
	const data: RenewInput = {
		provider: text(fd, 'provider', 200),
		reference: text(fd, 'reference', 200),
		start_date: date(fd, 'start_date'),
		due_date: date(fd, 'due_date'),
		cost: money(fd, 'cost'),
		excess: money(fd, 'excess'),
		notes: text(fd, 'notes', 5000)
	};
	if (!data.due_date) return { data, error: 'Enter the new renewal/expiry date.' };
	if (data.start_date && data.start_date >= data.due_date)
		return { data, error: 'The new end date must be after the start date.' };
	return { data };
}

/** Archive the current period, then roll the item on to the new one. */
export function renewItem(item: DueItem, data: RenewInput) {
	const conn = db();
	conn.transaction(() => {
		conn
			.prepare(
				`INSERT INTO item_history (item_id, provider, reference, start_date, due_date, cost, excess)
				 VALUES (?, ?, ?, ?, ?, ?, ?)`
			)
			.run(item.id, item.provider, item.reference, item.start_date, item.due_date, item.cost, item.excess);
		conn
			.prepare(
				`UPDATE due_items SET provider = @provider, reference = @reference, start_date = @start_date,
				 due_date = @due_date, cost = @cost, excess = @excess, notes = @notes, updated_at = datetime('now')
				 WHERE id = @id`
			)
			.run({ ...data, id: item.id });
	})();
}

export function itemHistory(itemId: number): ItemHistory[] {
	return db()
		.prepare('SELECT * FROM item_history WHERE item_id = ? ORDER BY COALESCE(due_date, renewed_at) DESC, id DESC')
		.all(itemId) as ItemHistory[];
}

/** Same day next year (29 Feb → 28 Feb). */
export function addYear(iso: string): string {
	const [y, m, d] = iso.split('-').map(Number);
	const next = new Date(Date.UTC(y + 1, m - 1, d));
	if (next.getUTCMonth() !== m - 1) next.setUTCDate(0);
	return next.toISOString().slice(0, 10);
}
