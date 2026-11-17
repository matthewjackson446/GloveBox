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
	`,

	/* 4: service history, mileage log, documents, renewal history */ `
	CREATE TABLE service_records (
		id         INTEGER PRIMARY KEY,
		vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
		date       TEXT NOT NULL,
		kind       TEXT NOT NULL DEFAULT 'service',
		title      TEXT NOT NULL,
		mileage    INTEGER,
		garage     TEXT,
		cost       REAL,
		notes      TEXT,
		created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
		created_at TEXT NOT NULL DEFAULT (datetime('now')),
		updated_at TEXT NOT NULL DEFAULT (datetime('now'))
	);
	CREATE INDEX service_records_vehicle ON service_records(vehicle_id, date);

	CREATE TABLE mileage_log (
		id         INTEGER PRIMARY KEY,
		vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
		date       TEXT NOT NULL,
		mileage    INTEGER NOT NULL,
		created_at TEXT NOT NULL DEFAULT (datetime('now'))
	);
	CREATE INDEX mileage_log_vehicle ON mileage_log(vehicle_id, date);

	CREATE TABLE documents (
		id          INTEGER PRIMARY KEY,
		vehicle_id  INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
		item_id     INTEGER REFERENCES due_items(id) ON DELETE SET NULL,
		record_id   INTEGER REFERENCES service_records(id) ON DELETE SET NULL,
		title       TEXT NOT NULL,
		filename    TEXT NOT NULL,
		stored_name TEXT NOT NULL UNIQUE,
		mime        TEXT NOT NULL,
		size        INTEGER NOT NULL,
		uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
		created_at  TEXT NOT NULL DEFAULT (datetime('now'))
	);
	CREATE INDEX documents_vehicle ON documents(vehicle_id);

	-- A snapshot of a renewal item each time it is renewed, for price comparison.
	CREATE TABLE item_history (
		id         INTEGER PRIMARY KEY,
		item_id    INTEGER NOT NULL REFERENCES due_items(id) ON DELETE CASCADE,
		provider   TEXT,
		reference  TEXT,
		start_date TEXT,
		due_date   TEXT,
		cost       REAL,
		excess     REAL,
		renewed_at TEXT NOT NULL DEFAULT (datetime('now'))
	);
	CREATE INDEX item_history_item ON item_history(item_id);
	`,

	/* 5: private calendar feed link per user */ `
	ALTER TABLE users ADD COLUMN calendar_token TEXT;
	CREATE UNIQUE INDEX users_calendar_token ON users(calendar_token);
	`,

	/* 6: when and why a vehicle was archived (sold, scrapped…) */ `
	ALTER TABLE vehicles ADD COLUMN archived_at TEXT;
	ALTER TABLE vehicles ADD COLUMN archive_note TEXT;
	`,

	/* 7: two-factor sign-in (TOTP) */ `
	ALTER TABLE users ADD COLUMN totp_secret TEXT;
	ALTER TABLE users ADD COLUMN totp_enabled INTEGER NOT NULL DEFAULT 0;
	-- JSON array of SHA-256 hashes of unused recovery codes.
	ALTER TABLE users ADD COLUMN totp_recovery TEXT;
	-- Last time-step accepted, so a code can't be reused.
	ALTER TABLE users ADD COLUMN totp_last_step INTEGER;
	`,

	/* 8: MOT advisories as a to-do list */ `
	-- Advisories (and minor defects) from a vehicle's latest MOT, or added by hand
	-- (test_number NULL). Not tied to mot_tests rows, which are replaced on every sync.
	CREATE TABLE mot_advisories (
		id          INTEGER PRIMARY KEY,
		vehicle_id  INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
		test_number TEXT,
		tested_on   TEXT,
		text        TEXT NOT NULL,
		severity    TEXT NOT NULL DEFAULT 'advisory' CHECK (severity IN ('advisory', 'minor')),
		-- How many earlier passed MOTs (one per MOT year, so retests aren't counted twice) flagged the same thing.
		seen_before INTEGER NOT NULL DEFAULT 0,
		-- superseded: a newer MOT replaced the list this came from.
		status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'fixed', 'dismissed', 'superseded')),
		resolved_at TEXT,
		created_at  TEXT NOT NULL DEFAULT (datetime('now'))
	);
	CREATE INDEX mot_advisories_vehicle ON mot_advisories(vehicle_id, status);

	-- Backfill from MOT history already synced: each vehicle's latest test.
	INSERT INTO mot_advisories (vehicle_id, test_number, tested_on, text, severity, seen_before)
	SELECT t.vehicle_id, t.test_number, substr(t.completed_at, 1, 10), json_extract(d.value, '$.text'),
		CASE WHEN upper(json_extract(d.value, '$.type')) = 'MINOR' THEN 'minor' ELSE 'advisory' END,
		(SELECT count(DISTINCT p.id) FROM mot_tests p, json_each(p.defects) pd
		 WHERE p.vehicle_id = t.vehicle_id
		   AND upper(p.result) LIKE 'PASS%'
		   AND substr(p.completed_at, 1, 10) < substr(t.completed_at, 1, 10)
		   AND json_extract(pd.value, '$.text') = json_extract(d.value, '$.text'))
	FROM mot_tests t, json_each(t.defects) d
	WHERE t.completed_at = (SELECT max(completed_at) FROM mot_tests WHERE vehicle_id = t.vehicle_id)
	  AND upper(json_extract(d.value, '$.type')) IN ('ADVISORY', 'MINOR')
	  AND json_extract(d.value, '$.text') IS NOT NULL;
	`,

	/* 9: emissions facts for clean air zone and road tax band */ `
	-- Month of first registration, YYYY-MM (DVLA monthOfFirstRegistration).
	ALTER TABLE vehicles ADD COLUMN first_registered TEXT;
	ALTER TABLE vehicles ADD COLUMN co2_emissions INTEGER;
	-- e.g. "Euro 6". Often missing from DVLA records.
	ALTER TABLE vehicles ADD COLUMN euro_status TEXT;
	-- car / van / motorcycle (from DVLA typeApproval M1 / N1 / L).
	ALTER TABLE vehicles ADD COLUMN vehicle_class TEXT;
	`,

	/* 10: driver renewals (licence photocard, CPC, tachograph card…) */ `
	-- People whose renewals a user tracks. Private to that user.
	CREATE TABLE drivers (
		id         INTEGER PRIMARY KEY,
		user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		name       TEXT NOT NULL,
		created_at TEXT NOT NULL DEFAULT (datetime('now'))
	);
	CREATE INDEX drivers_user ON drivers(user_id);

	CREATE TABLE driver_items (
		id         INTEGER PRIMARY KEY,
		driver_id  INTEGER NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
		type       TEXT NOT NULL,
		label      TEXT,
		due_date   TEXT,
		reference  TEXT,
		notes      TEXT,
		created_at TEXT NOT NULL DEFAULT (datetime('now')),
		updated_at TEXT NOT NULL DEFAULT (datetime('now'))
	);
	CREATE INDEX driver_items_driver ON driver_items(driver_id);

	-- Like reminder_log, for driver items.
	CREATE TABLE driver_reminder_log (
		user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		driver_item_id INTEGER NOT NULL REFERENCES driver_items(id) ON DELETE CASCADE,
		due_key        TEXT NOT NULL,
		threshold      TEXT NOT NULL,
		sent_at        TEXT NOT NULL DEFAULT (datetime('now')),
		PRIMARY KEY (user_id, driver_item_id, due_key, threshold)
	);
	`
];
