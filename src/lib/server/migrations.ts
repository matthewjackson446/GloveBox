/**
 * Schema migrations, applied in order at startup. The database's `user_version`
 * records how many have run. Never edit a released migration — append a new one.
 */
export const migrations: string[] = [
	/* 1: initial schema */ `
	CREATE TABLE users (
		id            INTEGER PRIMARY KEY,
		email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
		name          TEXT NOT NULL,
		password_hash TEXT NOT NULL,
		role          TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
		created_at    TEXT NOT NULL DEFAULT (datetime('now'))
	);

	CREATE TABLE sessions (
		id         TEXT PRIMARY KEY,
		user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		expires_at INTEGER NOT NULL
	);
	CREATE INDEX sessions_user ON sessions(user_id);

	CREATE TABLE vehicles (
		id                     INTEGER PRIMARY KEY,
		registration           TEXT NOT NULL,
		nickname               TEXT,
		make                   TEXT,
		model                  TEXT,
		year                   INTEGER,
		colour                 TEXT,
		fuel_type              TEXT,
		engine_cc              INTEGER,
		vin                    TEXT,
		mileage                INTEGER,
		purchase_date          TEXT,
		purchase_price         REAL,
		tyre_size              TEXT,
		tyre_pressure_front    TEXT,
		tyre_pressure_rear     TEXT,
		oil_spec               TEXT,
		key_code               TEXT,
		locking_wheel_nut_code TEXT,
		notes                  TEXT,
		archived               INTEGER NOT NULL DEFAULT 0,
		created_at             TEXT NOT NULL DEFAULT (datetime('now')),
		updated_at             TEXT NOT NULL DEFAULT (datetime('now'))
	);

	CREATE TABLE vehicle_users (
		vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
		user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		role       TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
		PRIMARY KEY (vehicle_id, user_id)
	);
	CREATE INDEX vehicle_users_user ON vehicle_users(user_id);

	CREATE TABLE due_items (
		id              INTEGER PRIMARY KEY,
		vehicle_id      INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
		type            TEXT NOT NULL,
		label           TEXT,
		due_date        TEXT,
		due_mileage     INTEGER,
		provider        TEXT,
		reference       TEXT,
		phone           TEXT,
		emergency_phone TEXT,
		website         TEXT,
		start_date      TEXT,
		cost            REAL,
		excess          REAL,
		notes           TEXT,
		created_at      TEXT NOT NULL DEFAULT (datetime('now')),
		updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
	);
	CREATE INDEX due_items_vehicle ON due_items(vehicle_id);

	CREATE TABLE contacts (
		id           INTEGER PRIMARY KEY,
		user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		name         TEXT NOT NULL,
		relationship TEXT,
		phone        TEXT NOT NULL
	);
	CREATE INDEX contacts_user ON contacts(user_id);

	CREATE TABLE settings (
		key   TEXT PRIMARY KEY,
		value TEXT NOT NULL
	);
	`,

	/* 2: reminders and notification channels */ `
	ALTER TABLE users ADD COLUMN reminders_enabled INTEGER NOT NULL DEFAULT 1;
	ALTER TABLE users ADD COLUMN reminder_days TEXT NOT NULL DEFAULT '30,14,7,1';
	ALTER TABLE users ADD COLUMN remind_overdue INTEGER NOT NULL DEFAULT 1;

	CREATE TABLE notification_channels (
		id           INTEGER PRIMARY KEY,
		user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		type         TEXT NOT NULL CHECK (type IN ('email', 'ntfy', 'gotify', 'discord', 'webhook')),
		name         TEXT NOT NULL,
		config       TEXT NOT NULL,
		enabled      INTEGER NOT NULL DEFAULT 1,
		last_error   TEXT,
		last_sent_at TEXT,
		created_at   TEXT NOT NULL DEFAULT (datetime('now'))
	);
	CREATE INDEX notification_channels_user ON notification_channels(user_id);

	-- One row per reminder sent, so the same reminder is never sent twice.
	-- due_key is the due date or mileage it was sent for, so renewing an item
	-- (moving its date) starts a fresh set of reminders.
	CREATE TABLE reminder_log (
		user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		item_id   INTEGER NOT NULL REFERENCES due_items(id) ON DELETE CASCADE,
		due_key   TEXT NOT NULL,
		threshold TEXT NOT NULL,
		sent_at   TEXT NOT NULL DEFAULT (datetime('now')),
		PRIMARY KEY (user_id, item_id, due_key, threshold)
	);
	`,

	/* 3: DVLA / DVSA lookups */ `
	ALTER TABLE vehicles ADD COLUMN auto_sync  INTEGER NOT NULL DEFAULT 1;
	ALTER TABLE vehicles ADD COLUMN tax_status TEXT;
	ALTER TABLE vehicles ADD COLUMN mot_status TEXT;
	ALTER TABLE vehicles ADD COLUMN synced_at  TEXT;
	ALTER TABLE vehicles ADD COLUMN sync_error TEXT;

	CREATE TABLE mot_tests (
		id            INTEGER PRIMARY KEY,
		vehicle_id    INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
		test_number   TEXT NOT NULL,
		completed_at  TEXT NOT NULL,
		result        TEXT NOT NULL,
		expiry_date   TEXT,
		odometer      INTEGER,
		odometer_unit TEXT,
		defects       TEXT NOT NULL DEFAULT '[]',
		UNIQUE (vehicle_id, test_number)
	);
	CREATE INDEX mot_tests_vehicle ON mot_tests(vehicle_id, completed_at);
	`
];
