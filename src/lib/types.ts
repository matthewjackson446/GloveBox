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
	created_at: string;
	updated_at: string;
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
