import type { AdvisoryStatus, MotAdvisory } from '$lib/types';
import { db } from './db';

/**
 * Make the latest MOT's advisories and minor defects the vehicle's open list.
 * Safe to run on every sync: once a test's advisories are in, they're left alone
 * so anything ticked off stays ticked off. When a newer test arrives, the open
 * items from the previous one are marked superseded and replaced.
 */
export function refreshAdvisories(vehicleId: number) {
	const conn = db();
	const latest = conn
		.prepare('SELECT test_number FROM mot_tests WHERE vehicle_id = ? ORDER BY completed_at DESC, id DESC LIMIT 1')
		.get(vehicleId) as { test_number: string } | undefined;
	if (!latest) return;

	const done = conn
		.prepare('SELECT 1 FROM mot_advisories WHERE vehicle_id = ? AND test_number = ? LIMIT 1')
		.get(vehicleId, latest.test_number);
	if (done) return;

	conn
		.prepare(
			`UPDATE mot_advisories SET status = 'superseded', resolved_at = date('now')
			 WHERE vehicle_id = ? AND test_number IS NOT NULL AND status = 'open'`
		)
		.run(vehicleId);

	conn
		.prepare(
			`INSERT INTO mot_advisories (vehicle_id, test_number, tested_on, text, severity, seen_before)
			 SELECT t.vehicle_id, t.test_number, substr(t.completed_at, 1, 10), json_extract(d.value, '$.text'),
				CASE WHEN upper(json_extract(d.value, '$.type')) = 'MINOR' THEN 'minor' ELSE 'advisory' END,
				(SELECT count(DISTINCT p.id) FROM mot_tests p, json_each(p.defects) pd
				 WHERE p.vehicle_id = t.vehicle_id
				   AND upper(p.result) LIKE 'PASS%'
				   AND substr(p.completed_at, 1, 10) < substr(t.completed_at, 1, 10)
				   AND json_extract(pd.value, '$.text') = json_extract(d.value, '$.text'))
			 FROM mot_tests t, json_each(t.defects) d
			 WHERE t.vehicle_id = ? AND t.test_number = ?
			   AND upper(json_extract(d.value, '$.type')) IN ('ADVISORY', 'MINOR')
			   AND json_extract(d.value, '$.text') IS NOT NULL`
		)
		.run(vehicleId, latest.test_number);
}

/** The latest MOT's advisories (any status) and ones added by hand, open first. */
export function listAdvisories(vehicleId: number): MotAdvisory[] {
	return db()
		.prepare(
			`SELECT * FROM mot_advisories
			 WHERE vehicle_id = ? AND status != 'superseded'
			   AND (test_number IS NULL OR test_number = (
				 SELECT test_number FROM mot_tests WHERE vehicle_id = ? ORDER BY completed_at DESC, id DESC LIMIT 1))
			 ORDER BY status = 'open' DESC, seen_before DESC, id`
		)
		.all(vehicleId, vehicleId) as MotAdvisory[];
}

/** Open advisory texts per vehicle, for the dashboard and reminders. */
export function openAdvisories(vehicleIds: number[]): Record<number, string[]> {
	if (!vehicleIds.length) return {};
	const rows = db()
		.prepare(
			`SELECT vehicle_id, text FROM mot_advisories
			 WHERE status = 'open' AND vehicle_id IN (${vehicleIds.map(() => '?').join(',')})
			 ORDER BY seen_before DESC, id`
		)
		.all(...vehicleIds) as { vehicle_id: number; text: string }[];
	const out: Record<number, string[]> = {};
	for (const r of rows) (out[r.vehicle_id] ??= []).push(r.text);
	return out;
}

export function addAdvisory(vehicleId: number, text: string) {
	db().prepare('INSERT INTO mot_advisories (vehicle_id, text) VALUES (?, ?)').run(vehicleId, text);
}

const SETTABLE: AdvisoryStatus[] = ['open', 'fixed', 'dismissed'];

export function setAdvisoryStatus(vehicleId: number, id: number, status: string): boolean {
	if (!SETTABLE.includes(status as AdvisoryStatus)) return false;
	const r = db()
		.prepare(
			`UPDATE mot_advisories SET status = ?, resolved_at = CASE WHEN ? = 'open' THEN NULL ELSE date('now') END
			 WHERE id = ? AND vehicle_id = ? AND status != 'superseded'`
		)
		.run(status, status, id, vehicleId);
	return r.changes > 0;
}

/** Only advisories added by hand can be deleted; ones from an MOT can be ignored instead. */
export function deleteAdvisory(vehicleId: number, id: number) {
	db()
		.prepare('DELETE FROM mot_advisories WHERE id = ? AND vehicle_id = ? AND test_number IS NULL')
		.run(id, vehicleId);
}
