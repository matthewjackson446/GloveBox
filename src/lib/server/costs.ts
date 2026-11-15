import { todayISO } from '$lib/status';
import { db } from './db';

/**
 * Running costs per year, built from what's already recorded:
 * - service history (each job counts in the year it was done)
 * - renewal periods: insurance, tax, breakdown, warranty, other (current + past renewals),
 *   each counted in the year the period started
 * - finance: the monthly payment for each month of the agreement
 * Planned costs on upcoming MOTs/services aren't counted until the work is logged in history.
 */

export const COST_CATEGORIES = [
	['insurance', 'Insurance'],
	['tax', 'Road tax'],
	['servicing', 'Servicing & repairs'],
	['breakdown', 'Breakdown'],
	['warranty', 'Warranty'],
	['finance', 'Finance'],
	['other', 'Other']
] as const;

export type CostCategory = (typeof COST_CATEGORIES)[number][0];

export interface CostVehicle {
	id: number;
	registration: string;
	nickname: string | null;
	make: string | null;
	model: string | null;
	archived: number;
}

type Totals = Record<CostCategory, number> & { total: number };

export interface YearCosts {
	year: number;
	totals: Totals;
	byVehicle: Record<number, Totals>;
}

export interface CostSummary {
	vehicles: CostVehicle[];
	/** Newest first; only years with any cost. */
	years: YearCosts[];
}

const emptyTotals = (): Totals =>
	Object.fromEntries([...COST_CATEGORIES.map(([k]) => [k, 0]), ['total', 0]]) as Totals;

/** Start of a renewal period: its start date, or a year before its due date. */
function periodStart(start: string | null, due: string | null): string | null {
	if (start) return start;
	if (!due) return null;
	const [y, m, d] = due.split('-').map(Number);
	return `${y - 1}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Number of monthly payments falling in each calendar year between start and end (inclusive of the start month). */
function monthsPerYear(start: string, end: string): Map<number, number> {
	const out = new Map<number, number>();
	let [y, m] = start.split('-').map(Number);
	const [ey, em] = end.split('-').map(Number);
	for (let guard = 0; (y < ey || (y === ey && m < em)) && guard < 600; guard++) {
		out.set(y, (out.get(y) ?? 0) + 1);
		m++;
		if (m > 12) {
			m = 1;
			y++;
		}
	}
	return out;
}

export function costSummary(userId: number): CostSummary {
	const conn = db();
	const vehicles = conn
		.prepare(
			`SELECT v.id, v.registration, v.nickname, v.make, v.model, v.archived FROM vehicles v
			 JOIN vehicle_users vu ON vu.vehicle_id = v.id WHERE vu.user_id = ?
			 ORDER BY v.archived, v.created_at, v.id`
		)
		.all(userId) as CostVehicle[];
	const ids = vehicles.map((v) => v.id);
	if (ids.length === 0) return { vehicles, years: [] };
	const qs = ids.map(() => '?').join(',');

	const years = new Map<number, YearCosts>();
	const add = (year: number, vehicleId: number, category: CostCategory, amount: number | null) => {
		if (!amount || !Number.isFinite(year)) return;
		let y = years.get(year);
		if (!y) years.set(year, (y = { year, totals: emptyTotals(), byVehicle: {} }));
		const v = (y.byVehicle[vehicleId] ??= emptyTotals());
		for (const t of [y.totals, v]) {
			t[category] += amount;
			t.total += amount;
		}
	};

	// 1. Service history.
	const records = conn
		.prepare(`SELECT vehicle_id, date, kind, cost FROM service_records WHERE vehicle_id IN (${qs}) AND cost IS NOT NULL`)
		.all(...ids) as { vehicle_id: number; date: string; kind: string; cost: number }[];
	for (const r of records) add(Number(r.date.slice(0, 4)), r.vehicle_id, r.kind === 'valet' || r.kind === 'other' ? 'other' : 'servicing', r.cost);

	// 2. Renewal periods: current values plus archived past periods.
	type Period = { vehicle_id: number; type: string; start_date: string | null; due_date: string | null; cost: number };
	const current = conn
		.prepare(
			`SELECT vehicle_id, type, start_date, due_date, cost FROM due_items
			 WHERE vehicle_id IN (${qs}) AND cost IS NOT NULL AND type IN ('insurance','tax','breakdown','warranty','other','finance')`
		)
		.all(...ids) as Period[];
	const past = conn
		.prepare(
			`SELECT d.vehicle_id, d.type, h.start_date, h.due_date, h.cost FROM item_history h
			 JOIN due_items d ON d.id = h.item_id
			 WHERE d.vehicle_id IN (${qs}) AND h.cost IS NOT NULL`
		)
		.all(...ids) as Period[];

	const today = todayISO();
	for (const p of [...current, ...past]) {
		if (p.type === 'finance') {
			// Monthly payments from the start until the end date (or today, if no end is recorded).
			if (!p.start_date) continue;
			for (const [year, months] of monthsPerYear(p.start_date, p.due_date ?? today)) add(year, p.vehicle_id, 'finance', p.cost * months);
			continue;
		}
		const start = periodStart(p.start_date, p.due_date);
		if (!start) continue;
		const category = (['insurance', 'tax', 'breakdown', 'warranty'] as const).find((c) => c === p.type) ?? 'other';
		add(Number(start.slice(0, 4)), p.vehicle_id, category, p.cost);
	}

	// Round once at the end to avoid floating-point pennies.
	const round = (t: Totals) => {
		for (const k of Object.keys(t) as (keyof Totals)[]) t[k] = Math.round(t[k] * 100) / 100;
	};
	for (const y of years.values()) {
		round(y.totals);
		Object.values(y.byVehicle).forEach(round);
	}

	return { vehicles, years: [...years.values()].sort((a, b) => b.year - a.year) };
}
