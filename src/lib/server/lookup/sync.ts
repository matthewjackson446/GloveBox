import { ITEM_TYPES } from '$lib/items';
import { formatDate } from '$lib/format';
import type { Vehicle } from '$lib/types';
import { db } from '../db';
import {
	LookupError,
	dvlaConfigured,
	dvlaLookup,
	dvsaConfigured,
	dvsaLookup,
	type DvlaVehicle,
	type DvsaTest,
	type DvsaVehicle
} from './clients';

export const lookupsConfigured = () => dvlaConfigured() || dvsaConfigured();

/* ---------- normalising government data ---------- */

const ACRONYMS = new Set(['BMW', 'MG', 'DS', 'VW', 'BYD', 'LDV', 'DAF', 'LEVC', 'GWM', 'GT', 'GTI', 'TDI', 'TSI']);

/** Government data is UPPERCASE: "VOLKSWAGEN GOLF GTI" → "Volkswagen Golf GTI". */
function tidy(s: string | undefined | null): string | null {
	const t = s?.trim();
	if (!t) return null;
	return t
		.split(/(\s+|-)/)
		.map((w) => (ACRONYMS.has(w.toUpperCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
		.join('');
}

function fuel(s: string | undefined): string | null {
	if (!s) return null;
	const f = s.toUpperCase();
	if (f.includes('ELECTRIC') && (f.includes('HYBRID') || f.includes('PETROL') || f.includes('DIESEL'))) return 'Hybrid';
	if (f.startsWith('ELECTRIC')) return 'Electric';
	return tidy(s);
}

/** Government dates come as "2026-03-01", "2026.03.01" or full timestamps. */
function isoDate(s: string | undefined | null): string | null {
	if (!s) return null;
	const d = s.replace(/\./g, '-').slice(0, 10);
	return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
}

function miles(t: DvsaTest): number | null {
	if (t.odometerResultType && t.odometerResultType !== 'READ') return null;
	const n = Number(t.odometerValue);
	if (!Number.isFinite(n) || n <= 0) return null;
	return t.odometerUnit?.toUpperCase().startsWith('K') ? Math.round(n * 0.621371) : Math.round(n);
}

const passed = (t: DvsaTest) => /^PASS/i.test(t.testResult);

function sortedTests(dvsa: DvsaVehicle | null): DvsaTest[] {
	return [...(dvsa?.motTests ?? [])].sort((a, b) => b.completedDate.localeCompare(a.completedDate));
}

/* ---------- looking up a registration for the "add vehicle" form ---------- */

export interface LookupResult {
	found: boolean;
	values: Record<string, string>;
	facts: string[];
	errors: string[];
}

export async function lookupRegistration(reg: string): Promise<LookupResult> {
	const errors: string[] = [];
	const [dvla, dvsa] = await Promise.all([
		dvlaConfigured() ? dvlaLookup(reg).catch((e) => (errors.push(msg(e)), null)) : null,
		dvsaConfigured() ? dvsaLookup(reg).catch((e) => (errors.push(msg(e)), null)) : null
	]);
	const values: Record<string, string> = {};
	const set = (k: string, v: string | number | null | undefined) => {
		if (v != null && v !== '') values[k] = String(v);
	};
	set('make', tidy(dvla?.make ?? dvsa?.make));
	set('model', tidy(dvsa?.model));
	set('colour', tidy(dvla?.colour ?? dvsa?.primaryColour));
	set('fuel_type', fuel(dvla?.fuelType ?? dvsa?.fuelType));
	set('engine_cc', dvla?.engineCapacity ?? (Number(dvsa?.engineSize) || null));
	set('year', dvla?.yearOfManufacture ?? (dvsa?.manufactureDate ?? dvsa?.firstUsedDate)?.slice(0, 4));
	const latestMiles = sortedTests(dvsa).map(miles).find((m) => m !== null);
	set('mileage', latestMiles);

	const facts: string[] = [];
	if (dvla?.taxStatus) facts.push(`Tax: ${dvla.taxStatus}${dvla.taxDueDate ? `, due ${formatDate(isoDate(dvla.taxDueDate))}` : ''}`);
	const motDate = motDueDate(dvla, dvsa);
	if (motDate) facts.push(`MOT: ${dvla?.motStatus ? `${dvla.motStatus}, ` : ''}expires ${formatDate(motDate)}`);
	if (dvsa?.motTests?.length) facts.push(`${dvsa.motTests.length} MOT test${dvsa.motTests.length === 1 ? '' : 's'} on record`);

	return { found: !!(dvla || dvsa), values, facts, errors };
}

const msg = (e: unknown) => (e instanceof LookupError ? e.message : `Lookup failed: ${(e as Error).message}`);

function motDueDate(dvla: DvlaVehicle | null, dvsa: DvsaVehicle | null): string | null {
	return (
		isoDate(dvla?.motExpiry) ??
		isoDate(sortedTests(dvsa).find(passed)?.expiryDate) ??
		isoDate(dvsa?.motTestDueDate)
	);
}

/* ---------- syncing a saved vehicle ---------- */

export interface SyncResult {
	changes: string[];
	errors: string[];
}

export async function syncVehicle(vehicleId: number): Promise<SyncResult> {
	const conn = db();
	const v = conn.prepare('SELECT * FROM vehicles WHERE id = ?').get(vehicleId) as Vehicle | undefined;
	if (!v) return { changes: [], errors: ['Vehicle not found.'] };

	const changes: string[] = [];
	const errors: string[] = [];
	const [dvla, dvsa] = await Promise.all([
		dvlaConfigured()
			? dvlaLookup(v.registration)
					.then((r) => (r ? r : (errors.push('DVLA has no record of this registration.'), null)))
					.catch((e) => (errors.push(msg(e)), null))
			: null,
		dvsaConfigured() ? dvsaLookup(v.registration).catch((e) => (errors.push(msg(e)), null)) : null
	]);

	conn.transaction(() => {
		// 1. Fill in details the user left blank. Never overwrite what they typed.
		const fills: [keyof Vehicle, string | number | null][] = [
			['make', tidy(dvla?.make ?? dvsa?.make)],
			['model', tidy(dvsa?.model)],
			['colour', tidy(dvla?.colour ?? dvsa?.primaryColour)],
			['fuel_type', fuel(dvla?.fuelType ?? dvsa?.fuelType)],
			['engine_cc', dvla?.engineCapacity ?? null],
			['year', dvla?.yearOfManufacture ?? null]
		];
		for (const [col, val] of fills) {
			if (val != null && (v[col] === null || v[col] === '')) {
				conn.prepare(`UPDATE vehicles SET ${col} = ? WHERE id = ?`).run(val, v.id);
				changes.push(`Filled in ${col.replace('_', ' ')}`);
			}
		}

		// 2. Keep tax and MOT due dates current.
		if (v.auto_sync) {
			if (dvla?.taxStatus === 'Taxed' && isoDate(dvla.taxDueDate)) {
				setDueDate(v.id, 'tax', isoDate(dvla.taxDueDate)!, changes);
			}
			const mot = motDueDate(dvla, dvsa);
			if (mot) setDueDate(v.id, 'mot', mot, changes);
		}

		// 3. MOT history.
		if (dvsa?.motTests) {
			conn.prepare('DELETE FROM mot_tests WHERE vehicle_id = ?').run(v.id);
			const insert = conn.prepare(
				`INSERT OR IGNORE INTO mot_tests (vehicle_id, test_number, completed_at, result, expiry_date, odometer, odometer_unit, defects)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
			);
			for (const t of dvsa.motTests) {
				insert.run(
					v.id,
					t.motTestNumber,
					t.completedDate,
					t.testResult,
					isoDate(t.expiryDate),
					Number(t.odometerValue) || null,
					t.odometerUnit ?? null,
					JSON.stringify((t.defects ?? []).map((d) => ({ type: d.type, text: d.text, dangerous: !!d.dangerous })))
				);
			}

			// 4. Mileage: only ever move it forwards.
			const latest = sortedTests(dvsa).map(miles).find((m) => m !== null);
			if (latest != null && (v.mileage == null || latest > v.mileage)) {
				conn.prepare('UPDATE vehicles SET mileage = ? WHERE id = ?').run(latest, v.id);
				changes.push(`Mileage updated to ${latest.toLocaleString('en-GB')} from the last MOT`);
			}
		}

		conn
			.prepare(
				`UPDATE vehicles SET tax_status = COALESCE(?, tax_status), mot_status = COALESCE(?, mot_status),
				 synced_at = datetime('now'), sync_error = ? WHERE id = ?`
			)
			.run(dvla?.taxStatus ?? null, dvla?.motStatus ?? null, errors.length ? errors.join(' ') : null, v.id);
	})();

	return { changes, errors };
}

/** Set (or create) the vehicle's tax/MOT item due date. Moving the date restarts its reminders. */
function setDueDate(vehicleId: number, type: 'tax' | 'mot', date: string, changes: string[]) {
	const conn = db();
	const item = conn
		.prepare('SELECT id, due_date FROM due_items WHERE vehicle_id = ? AND type = ? ORDER BY id LIMIT 1')
		.get(vehicleId, type) as { id: number; due_date: string | null } | undefined;
	const label = ITEM_TYPES[type].label;
	if (!item) {
		conn.prepare('INSERT INTO due_items (vehicle_id, type, due_date) VALUES (?, ?, ?)').run(vehicleId, type, date);
		changes.push(`Added ${label}, due ${formatDate(date)}`);
	} else if (item.due_date !== date) {
		conn
			.prepare(`UPDATE due_items SET due_date = ?, updated_at = datetime('now') WHERE id = ?`)
			.run(date, item.id);
		changes.push(`${label} date updated to ${formatDate(date)}`);
	}
}

/** Nightly: refresh every active vehicle that has auto-sync on. */
export async function syncAllVehicles(): Promise<{ vehicles: number; changed: number; failed: number }> {
	const out = { vehicles: 0, changed: 0, failed: 0 };
	if (!lookupsConfigured()) return out;
	const ids = db()
		.prepare('SELECT id FROM vehicles WHERE archived = 0 AND auto_sync = 1 ORDER BY id')
		.all() as { id: number }[];
	for (const { id } of ids) {
		const r = await syncVehicle(id);
		out.vehicles++;
		if (r.changes.length) out.changed++;
		if (r.errors.length) out.failed++;
		await new Promise((res) => setTimeout(res, 500)); // be gentle with the APIs
	}
	return out;
}
