export type UserRole = 'admin' | 'member';
export type VehicleRole = 'owner' | 'editor' | 'viewer';

export interface SessionUser {
	id: number;
	email: string;
	name: string;
	role: UserRole;
}

export interface Vehicle {
	id: number;
	registration: string;
	nickname: string | null;
	make: string | null;
	model: string | null;
	year: number | null;
	colour: string | null;
	fuel_type: string | null;
	engine_cc: number | null;
	vin: string | null;
	mileage: number | null;
	purchase_date: string | null;
	purchase_price: number | null;
	tyre_size: string | null;
	tyre_pressure_front: string | null;
	tyre_pressure_rear: string | null;
	oil_spec: string | null;
	key_code: string | null;
	locking_wheel_nut_code: string | null;
	notes: string | null;
	archived: number;
	auto_sync: number;
	tax_status: string | null;
	mot_status: string | null;
	synced_at: string | null;
	sync_error: string | null;
	created_at: string;
	updated_at: string;
}

export interface MotDefect {
	type: string;
	text: string;
	dangerous: boolean;
}

export interface MotTest {
	id: number;
	vehicle_id: number;
	test_number: string;
	completed_at: string;
	result: string;
	expiry_date: string | null;
	odometer: number | null;
	odometer_unit: string | null;
	defects: string;
}

export interface ServiceRecord {
	id: number;
	vehicle_id: number;
	date: string;
	kind: string;
	title: string;
	mileage: number | null;
	garage: string | null;
	cost: number | null;
	notes: string | null;
	created_at: string;
}

export interface DocumentRow {
	id: number;
	vehicle_id: number;
	item_id: number | null;
	record_id: number | null;
	title: string;
	filename: string;
	mime: string;
	size: number;
	created_at: string;
}

export interface ItemHistory {
	id: number;
	item_id: number;
	provider: string | null;
	reference: string | null;
	start_date: string | null;
	due_date: string | null;
	cost: number | null;
	excess: number | null;
	renewed_at: string;
}

export interface MileageReading {
	date: string;
	mileage: number;
	source: 'manual' | 'service' | 'mot';
}

export interface VehicleWithRole extends Vehicle {
	role: VehicleRole;
}

export interface DueItem {
	id: number;
	vehicle_id: number;
	type: string;
	label: string | null;
	due_date: string | null;
	due_mileage: number | null;
	provider: string | null;
	reference: string | null;
	phone: string | null;
	emergency_phone: string | null;
	website: string | null;
	start_date: string | null;
	cost: number | null;
	excess: number | null;
	notes: string | null;
	created_at: string;
	updated_at: string;
}

export interface Contact {
	id: number;
	user_id: number;
	name: string;
	relationship: string | null;
	phone: string;
}
