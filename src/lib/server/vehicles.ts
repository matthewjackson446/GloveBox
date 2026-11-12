import { error } from '@sveltejs/kit';
import { ITEM_FIELDS, ITEM_TYPES, type ItemField } from '$lib/items';
import type { DueItem, SessionUser, VehicleRole, VehicleWithRole } from '$lib/types';
import { db } from './db';
import { date, int, money, text } from './form';

/* ---------- access control ---------- */

const ROLE_RANK: Record<VehicleRole, number> = { viewer: 0, editor: 1, owner: 2 };

export function canEdit(role: VehicleRole) {
	return ROLE_RANK[role] >= ROLE_RANK.editor;
}

export function listVehicles(userId: number): VehicleWithRole[] {
	return db()
		.prepare(
			`SELECT v.*, vu.role FROM vehicles v
			 JOIN vehicle_users vu ON vu.vehicle_id = v.id
			 WHERE vu.user_id = ? AND v.archived = 0
			 ORDER BY v.created_at, v.id`
		)
		.all(userId) as VehicleWithRole[];
}

export function getVehicle(vehicleId: number, userId: number): VehicleWithRole | undefined {
	return db()
		.prepare(
			`SELECT v.*, vu.role FROM vehicles v
			 JOIN vehicle_users vu ON vu.vehicle_id = v.id
			 WHERE v.id = ? AND vu.user_id = ?`
		)
		.get(vehicleId, userId) as VehicleWithRole | undefined;
}

/**
 * Load a vehicle the user can access with at least `need` role.
 * 404s if they have no access at all, so IDs of other people's vehicles aren't revealed.
 */
export function requireVehicle(
	id: string,
	user: SessionUser | null,
	need: VehicleRole = 'viewer'
): VehicleWithRole {
	if (!user) error(401, 'Not signed in');
	const vehicleId = Number(id);
	const vehicle = Number.isInteger(vehicleId) ? getVehicle(vehicleId, user.id) : undefined;
	if (!vehicle) error(404, 'Vehicle not found');
	if (ROLE_RANK[vehicle.role] < ROLE_RANK[need]) error(403, 'You don’t have permission to do that');
	return vehicle;
}

/* ---------- vehicles ---------- */

export const VEHICLE_COLUMNS = [
	'registration',
	'nickname',
	'make',
	'model',
	'year',
	'colour',
	'fuel_type',
	'engine_cc',
	'vin',
	'mileage',
	'purchase_date',
	'purchase_price',
	'tyre_size',
	'tyre_pressure_front',
	'tyre_pressure_rear',
	'oil_spec',
	'key_code',
	'locking_wheel_nut_code',
	'notes'
] as const;

type VehicleInput = Record<(typeof VEHICLE_COLUMNS)[number], string | number | null>;

/** UK-style: uppercase, single spaces. */
export function normaliseRegistration(reg: string): string {
	return reg.toUpperCase().replace(/\s+/g, ' ').trim();
}

export function readVehicleForm(fd: FormData): { data: VehicleInput; error?: string } {
	const reg = text(fd, 'registration', 16);
	const data: VehicleInput = {
		registration: reg ? normaliseRegistration(reg) : null,
		nickname: text(fd, 'nickname', 60),
		make: text(fd, 'make', 60),
		model: text(fd, 'model', 60),
		year: int(fd, 'year'),
		colour: text(fd, 'colour', 40),
		fuel_type: text(fd, 'fuel_type', 30),
		engine_cc: int(fd, 'engine_cc'),
		vin: text(fd, 'vin', 32)?.toUpperCase() ?? null,
		mileage: int(fd, 'mileage'),
		purchase_date: date(fd, 'purchase_date'),
		purchase_price: money(fd, 'purchase_price'),
		tyre_size: text(fd, 'tyre_size', 40),
		tyre_pressure_front: text(fd, 'tyre_pressure_front', 40),
		tyre_pressure_rear: text(fd, 'tyre_pressure_rear', 40),
		oil_spec: text(fd, 'oil_spec', 60),
		key_code: text(fd, 'key_code', 60),
		locking_wheel_nut_code: text(fd, 'locking_wheel_nut_code', 60),
		notes: text(fd, 'notes', 5000)
	};
	if (!data.registration) return { data, error: 'Registration is required.' };
	const year = data.year as number | null;
	if (year !== null && (year < 1885 || year > new Date().getFullYear() + 1))
		return { data, error: 'That year doesn’t look right.' };
	return { data };
}

export function createVehicle(userId: number, data: VehicleInput): number {
	const conn = db();
	const cols = VEHICLE_COLUMNS.join(', ');
	const params = VEHICLE_COLUMNS.map((c) => '@' + c).join(', ');
	return conn.transaction(() => {
		const { lastInsertRowid } = conn
			.prepare(`INSERT INTO vehicles (${cols}) VALUES (${params})`)
			.run(data);
		const id = Number(lastInsertRowid);
		conn
			.prepare(`INSERT INTO vehicle_users (vehicle_id, user_id, role) VALUES (?, ?, 'owner')`)
			.run(id, userId);
		return id;
	})();
}

export function updateVehicle(id: number, data: VehicleInput) {
	const sets = VEHICLE_COLUMNS.map((c) => `${c} = @${c}`).join(', ');
	db()
		.prepare(`UPDATE vehicles SET ${sets}, updated_at = datetime('now') WHERE id = @id`)
		.run({ ...data, id });
}

export function deleteVehicle(id: number) {
	db().prepare('DELETE FROM vehicles WHERE id = ?').run(id);
}

/* ---------- sharing ---------- */

export interface VehicleMember {
	user_id: number;
	name: string;
	email: string;
	role: VehicleRole;
}

export function listMembers(vehicleId: number): VehicleMember[] {
	return db()
		.prepare(
			`SELECT u.id AS user_id, u.name, u.email, vu.role FROM vehicle_users vu
			 JOIN users u ON u.id = vu.user_id WHERE vu.vehicle_id = ?
			 ORDER BY CASE vu.role WHEN 'owner' THEN 0 WHEN 'editor' THEN 1 ELSE 2 END, u.name`
		)
		.all(vehicleId) as VehicleMember[];
}

export function setMember(vehicleId: number, userId: number, role: VehicleRole) {
	db()
		.prepare(
			`INSERT INTO vehicle_users (vehicle_id, user_id, role) VALUES (?, ?, ?)
			 ON CONFLICT (vehicle_id, user_id) DO UPDATE SET role = excluded.role`
		)
		.run(vehicleId, userId, role);
}

export function removeMember(vehicleId: number, userId: number) {
	db().prepare('DELETE FROM vehicle_users WHERE vehicle_id = ? AND user_id = ?').run(vehicleId, userId);
}

export function ownerCount(vehicleId: number): number {
	return (
		db()
			.prepare(`SELECT COUNT(*) AS n FROM vehicle_users WHERE vehicle_id = ? AND role = 'owner'`)
			.get(vehicleId) as { n: number }
	).n;
}

/* ---------- due items ---------- */

export function listItems(vehicleIds: number[]): DueItem[] {
	if (vehicleIds.length === 0) return [];
	const qs = vehicleIds.map(() => '?').join(', ');
	return db()
		.prepare(`SELECT * FROM due_items WHERE vehicle_id IN (${qs}) ORDER BY due_date IS NULL, due_date`)
		.all(...vehicleIds) as DueItem[];
}

export function getItem(vehicleId: number, itemId: string): DueItem {
	const item = db()
		.prepare('SELECT * FROM due_items WHERE id = ? AND vehicle_id = ?')
		.get(Number(itemId), vehicleId) as DueItem | undefined;
	if (!item) error(404, 'Item not found');
	return item;
}

type ItemInput = Record<ItemField, string | number | null>;

const MONEY_FIELDS: ItemField[] = ['cost', 'excess'];
const DATE_FIELDS: ItemField[] = ['due_date', 'start_date'];

/** Reads only the fields that apply to this item type; the rest are cleared. */
export function readItemForm(fd: FormData, type: string): { data: ItemInput; error?: string } {
	const def = ITEM_TYPES[type];
	const data = {} as ItemInput;
	for (const f of ITEM_FIELDS) {
		if (!def.fields[f]) data[f] = null;
		else if (MONEY_FIELDS.includes(f)) data[f] = money(fd, f);
		else if (DATE_FIELDS.includes(f)) data[f] = date(fd, f);
		else if (f === 'due_mileage') data[f] = int(fd, f);
		else data[f] = text(fd, f, f === 'notes' ? 5000 : 200);
	}
	if (type === 'other' && !data.label) return { data, error: 'Give this item a name.' };
	return { data };
}

export function createItem(vehicleId: number, type: string, data: ItemInput): number {
	const cols = ['vehicle_id', 'type', ...ITEM_FIELDS];
	const { lastInsertRowid } = db()
		.prepare(`INSERT INTO due_items (${cols.join(', ')}) VALUES (${cols.map((c) => '@' + c).join(', ')})`)
		.run({ ...data, vehicle_id: vehicleId, type });
	return Number(lastInsertRowid);
}

export function updateItem(itemId: number, data: ItemInput) {
	const sets = ITEM_FIELDS.map((c) => `${c} = @${c}`).join(', ');
	db()
		.prepare(`UPDATE due_items SET ${sets}, updated_at = datetime('now') WHERE id = @id`)
		.run({ ...data, id: itemId });
}

export function deleteItem(itemId: number) {
	db().prepare('DELETE FROM due_items WHERE id = ?').run(itemId);
}
