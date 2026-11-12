import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { migrations } from './migrations';

let instance: Database.Database | null = null;

/** Where the database (and later, uploaded documents) live. `/config` in Docker. */
export function dataDir(): string {
	return resolve(process.env.DATA_DIR ?? 'data');
}

/** Lazily opened so that `vite build` never touches the filesystem. */
export function db(): Database.Database {
	if (instance) return instance;
	const dir = dataDir();
	mkdirSync(dir, { recursive: true });
	const conn = new Database(join(dir, 'glovebox.db'));
	conn.pragma('journal_mode = WAL');
	conn.pragma('foreign_keys = ON');
	conn.pragma('busy_timeout = 5000');
	migrate(conn);
	instance = conn;
	return conn;
}

function migrate(conn: Database.Database) {
	const current = conn.pragma('user_version', { simple: true }) as number;
	if (current > migrations.length) {
		throw new Error(
			`Database schema v${current} is newer than this version of Glovebox supports (v${migrations.length}). ` +
				'Upgrade the container image instead of downgrading.'
		);
	}
	for (let v = current; v < migrations.length; v++) {
		conn.transaction(() => {
			conn.exec(migrations[v]);
			conn.pragma(`user_version = ${v + 1}`);
		})();
		console.log(`[glovebox] applied database migration ${v + 1}`);
	}
}
