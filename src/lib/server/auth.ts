import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import type { RequestEvent } from '@sveltejs/kit';
import type { SessionUser } from '$lib/types';
import { db } from './db';

/* ---------- passwords (scrypt, built into Node — no native deps) ---------- */

const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEYLEN = 64;

function scrypt(password: string, salt: Buffer, keylen: number, opts: typeof SCRYPT) {
	return new Promise<Buffer>((resolve, reject) =>
		scryptCb(password.normalize('NFKC'), salt, keylen, opts, (err, key) =>
			err ? reject(err) : resolve(key)
		)
	);
}

export const MIN_PASSWORD_LENGTH = 8;

export async function hashPassword(password: string): Promise<string> {
	const salt = randomBytes(16);
	const hash = await scrypt(password, salt, KEYLEN, SCRYPT);
	const { N, r, p } = SCRYPT;
	return `scrypt$${N}$${r}$${p}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
	const [alg, N, r, p, salt, hash] = stored.split('$');
	if (alg !== 'scrypt' || !salt || !hash) return false;
	const expected = Buffer.from(hash, 'base64');
	const actual = await scrypt(password, Buffer.from(salt, 'base64'), expected.length, {
		N: Number(N),
		r: Number(r),
		p: Number(p),
		maxmem: SCRYPT.maxmem
	});
	return timingSafeEqual(expected, actual);
}

/** Used to spend the same time on unknown emails as on wrong passwords. */
let dummyHash: Promise<string> | null = null;
export function getDummyHash() {
	return (dummyHash ??= hashPassword(randomBytes(16).toString('hex')));
}

/* ---------- sessions ---------- */

export const SESSION_COOKIE = 'glovebox_session';
const DAY = 86_400_000;
const SESSION_DAYS = 30;
const RENEW_WITHIN_DAYS = 15;

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export function createSession(userId: number) {
	const token = randomBytes(32).toString('base64url');
	const expires = Date.now() + SESSION_DAYS * DAY;
	const conn = db();
	conn.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
	conn
		.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)')
		.run(hashToken(token), userId, expires);
	return { token, expires: new Date(expires) };
}

interface SessionRow {
	id: string;
	expires_at: number;
	user_id: number;
	email: string;
	name: string;
	role: SessionUser['role'];
}

/** Returns the user, plus a new expiry if the session was extended. */
export function validateSession(token: string): { user: SessionUser; renewed: Date | null } | null {
	const conn = db();
	const row = conn
		.prepare(
			`SELECT s.id, s.expires_at, u.id AS user_id, u.email, u.name, u.role
			 FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ?`
		)
		.get(hashToken(token)) as SessionRow | undefined;
	if (!row) return null;

	const now = Date.now();
	if (row.expires_at < now) {
		conn.prepare('DELETE FROM sessions WHERE id = ?').run(row.id);
		return null;
	}

	let renewed: Date | null = null;
	if (row.expires_at - now < RENEW_WITHIN_DAYS * DAY) {
		const expires = now + SESSION_DAYS * DAY;
		conn.prepare('UPDATE sessions SET expires_at = ? WHERE id = ?').run(expires, row.id);
		renewed = new Date(expires);
	}

	return {
		user: { id: row.user_id, email: row.email, name: row.name, role: row.role },
		renewed
	};
}

export function deleteSession(token: string) {
	db().prepare('DELETE FROM sessions WHERE id = ?').run(hashToken(token));
}

/** Sign a user out everywhere, optionally keeping the current session. */
export function deleteUserSessions(userId: number, keepToken?: string | null) {
	if (keepToken) {
		db()
			.prepare('DELETE FROM sessions WHERE user_id = ? AND id != ?')
			.run(userId, hashToken(keepToken));
	} else {
		db().prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
	}
}

/**
 * Only mark the cookie Secure when the browser is actually on HTTPS. Unraid users
 * often reach the app on plain http://192.168.x.x, where a Secure cookie would be dropped.
 */
export function isSecureRequest(event: RequestEvent): boolean {
	return (
		event.url.protocol === 'https:' ||
		event.request.headers.get('x-forwarded-proto')?.split(',')[0].trim() === 'https'
	);
}

export function setSessionCookie(event: RequestEvent, token: string, expires: Date) {
	event.cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: isSecureRequest(event),
		expires
	});
}

export function clearSessionCookie(event: RequestEvent) {
	event.cookies.delete(SESSION_COOKIE, { path: '/', secure: isSecureRequest(event) });
}

/* ---------- login throttling (in-memory, per IP + email) ---------- */

const attempts = new Map<string, { count: number; first: number }>();
const WINDOW = 15 * 60_000;
const MAX_ATTEMPTS = 10;

export function isThrottled(key: string): boolean {
	const a = attempts.get(key);
	if (!a) return false;
	if (Date.now() - a.first > WINDOW) {
		attempts.delete(key);
		return false;
	}
	return a.count >= MAX_ATTEMPTS;
}

export function recordFailedLogin(key: string) {
	const a = attempts.get(key);
	if (!a || Date.now() - a.first > WINDOW) attempts.set(key, { count: 1, first: Date.now() });
	else a.count++;
}

export function clearFailedLogins(key: string) {
	attempts.delete(key);
}

/* ---------- users ---------- */

export function userCount(): number {
	return (db().prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number }).n;
}

export function findUserByEmail(email: string) {
	return db().prepare('SELECT * FROM users WHERE email = ?').get(email) as
		| (SessionUser & { password_hash: string })
		| undefined;
}

export function normaliseEmail(email: string): string {
	return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
	return /^[^\s@]+@[^\s@]+$/.test(email) && email.length <= 254;
}
