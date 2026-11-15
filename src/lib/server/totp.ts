import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import QRCode from 'qrcode';
import { db } from './db';

/**
 * Two-factor sign-in with time-based one-time codes (RFC 6238: HMAC-SHA1, 30-second steps,
 * 6 digits), compatible with Google Authenticator, Microsoft Authenticator, 1Password, Bitwarden etc.
 */

const PERIOD = 30;
const DIGITS = 6;
const ISSUER = 'Glovebox';
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/* ---------- base32 (RFC 4648, no padding) ---------- */

export function base32Encode(buf: Buffer): string {
	let bits = 0;
	let value = 0;
	let out = '';
	for (const byte of buf) {
		value = (value << 8) | byte;
		bits += 8;
		while (bits >= 5) {
			out += B32[(value >>> (bits - 5)) & 31];
			bits -= 5;
		}
	}
	if (bits > 0) out += B32[(value << (5 - bits)) & 31];
	return out;
}

export function base32Decode(s: string): Buffer {
	const clean = s.toUpperCase().replace(/[^A-Z2-7]/g, '');
	let bits = 0;
	let value = 0;
	const out: number[] = [];
	for (const ch of clean) {
		value = (value << 5) | B32.indexOf(ch);
		bits += 5;
		if (bits >= 8) {
			out.push((value >>> (bits - 8)) & 255);
			bits -= 8;
		}
	}
	return Buffer.from(out);
}

/* ---------- codes ---------- */

export const newSecret = () => base32Encode(randomBytes(20));

export function codeAt(secret: string, step: number): string {
	const counter = Buffer.alloc(8);
	counter.writeBigUInt64BE(BigInt(step));
	const h = createHmac('sha1', base32Decode(secret)).update(counter).digest();
	const offset = h[h.length - 1] & 15;
	const n = (h.readUInt32BE(offset) & 0x7fffffff) % 10 ** DIGITS;
	return String(n).padStart(DIGITS, '0');
}

export const currentStep = (now = Date.now()) => Math.floor(now / 1000 / PERIOD);

/**
 * Check a code against the previous, current and next step (allowing for clock drift).
 * Returns the matching step, or null. Steps at or before `lastStep` are refused so a code can't be replayed.
 */
export function verifyCode(secret: string, code: string, lastStep: number | null, now = Date.now()): number | null {
	const c = code.replace(/\s+/g, '');
	if (!/^\d{6}$/.test(c)) return null;
	const step = currentStep(now);
	for (const s of [step - 1, step, step + 1]) {
		if (lastStep !== null && s <= lastStep) continue;
		const expected = Buffer.from(codeAt(secret, s));
		if (timingSafeEqual(expected, Buffer.from(c))) return s;
	}
	return null;
}

export function otpauthUri(secret: string, account: string): string {
	const label = encodeURIComponent(`${ISSUER}:${account}`);
	return `otpauth://totp/${label}?secret=${secret}&issuer=${ISSUER}&algorithm=SHA1&digits=${DIGITS}&period=${PERIOD}`;
}

export function qrSvg(uri: string): Promise<string> {
	return QRCode.toString(uri, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#18181b', light: '#ffffff' } });
}

/* ---------- recovery codes ---------- */

const hashCode = (c: string) => createHash('sha256').update(c.toLowerCase().replace(/[^a-z0-9]/g, '')).digest('hex');

/** Ten single-use codes like "k7m2-q9xa". Only their hashes are stored. */
export function newRecoveryCodes(): { codes: string[]; hashes: string[] } {
	const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789'; // no look-alikes (0/o, 1/l/i)
	const codes = Array.from({ length: 10 }, () => {
		const b = randomBytes(8);
		const s = [...b].map((x) => alphabet[x % alphabet.length]).join('');
		return `${s.slice(0, 4)}-${s.slice(4)}`;
	});
	return { codes, hashes: codes.map(hashCode) };
}

/* ---------- per-user state ---------- */

export interface TotpState {
	totp_secret: string | null;
	totp_enabled: number;
	totp_recovery: string | null;
	totp_last_step: number | null;
}

export function totpState(userId: number): TotpState {
	return db()
		.prepare('SELECT totp_secret, totp_enabled, totp_recovery, totp_last_step FROM users WHERE id = ?')
		.get(userId) as TotpState;
}

export const recoveryLeft = (s: TotpState) => (s.totp_recovery ? (JSON.parse(s.totp_recovery) as string[]).length : 0);

/** Begin setup: store a fresh secret, not yet enabled. */
export function beginSetup(userId: number): string {
	const secret = newSecret();
	db()
		.prepare('UPDATE users SET totp_secret = ?, totp_enabled = 0, totp_recovery = NULL, totp_last_step = NULL WHERE id = ?')
		.run(secret, userId);
	return secret;
}

export function enable(userId: number, step: number): string[] {
	const { codes, hashes } = newRecoveryCodes();
	db()
		.prepare('UPDATE users SET totp_enabled = 1, totp_last_step = ?, totp_recovery = ? WHERE id = ?')
		.run(step, JSON.stringify(hashes), userId);
	return codes;
}

export function regenerateRecovery(userId: number): string[] {
	const { codes, hashes } = newRecoveryCodes();
	db().prepare('UPDATE users SET totp_recovery = ? WHERE id = ?').run(JSON.stringify(hashes), userId);
	return codes;
}

export function disable(userId: number) {
	db()
		.prepare('UPDATE users SET totp_secret = NULL, totp_enabled = 0, totp_recovery = NULL, totp_last_step = NULL WHERE id = ?')
		.run(userId);
}

/**
 * Check a 6-digit code or a recovery code for a user with 2FA on. On success, records the step
 * (or uses up the recovery code) so it can't be used again.
 */
export function checkSecondFactor(userId: number, input: string): { ok: boolean; usedRecovery?: boolean } {
	const s = totpState(userId);
	if (!s.totp_enabled || !s.totp_secret) return { ok: false };
	const value = input.trim();

	const step = verifyCode(s.totp_secret, value, s.totp_last_step);
	if (step !== null) {
		db().prepare('UPDATE users SET totp_last_step = ? WHERE id = ?').run(step, userId);
		return { ok: true };
	}

	const hashes = s.totp_recovery ? (JSON.parse(s.totp_recovery) as string[]) : [];
	const h = hashCode(value);
	const i = hashes.indexOf(h);
	if (value.replace(/[^a-z0-9]/gi, '').length === 8 && i !== -1) {
		hashes.splice(i, 1);
		db().prepare('UPDATE users SET totp_recovery = ? WHERE id = ?').run(JSON.stringify(hashes), userId);
		return { ok: true, usedRecovery: true };
	}
	return { ok: false };
}

/* ---------- the pending "password OK, now enter your code" step ---------- */

const pending = new Map<string, { userId: number; expires: number; attempts: number; next: string }>();
const PENDING_MS = 5 * 60_000;
export const PENDING_COOKIE = 'glovebox_2fa';
const hashToken = (t: string) => createHash('sha256').update(t).digest('hex');

export function startPending(userId: number, next: string): string {
	for (const [k, v] of pending) if (v.expires < Date.now()) pending.delete(k);
	const token = randomBytes(24).toString('base64url');
	pending.set(hashToken(token), { userId, expires: Date.now() + PENDING_MS, attempts: 0, next });
	return token;
}

export function getPending(token: string | undefined) {
	if (!token) return null;
	const p = pending.get(hashToken(token));
	if (!p || p.expires < Date.now()) {
		if (p) pending.delete(hashToken(token));
		return null;
	}
	return p;
}

/** Count a wrong code; after 5 the pending sign-in is thrown away and they start again. */
export function failPending(token: string): boolean {
	const p = pending.get(hashToken(token));
	if (!p) return false;
	p.attempts++;
	if (p.attempts >= 5) {
		pending.delete(hashToken(token));
		return false;
	}
	return true;
}

export const endPending = (token: string) => pending.delete(hashToken(token));
