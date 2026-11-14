/** Small helpers for reading FormData into typed, trimmed, nullable values. */

export function text(fd: FormData, key: string, max = 500): string | null {
	const v = fd.get(key);
	if (typeof v !== 'string') return null;
	const t = v.trim();
	return t ? t.slice(0, max) : null;
}

export function int(fd: FormData, key: string): number | null {
	const t = text(fd, key, 32);
	if (t === null) return null;
	const n = Number(t.replace(/[,\s]/g, ''));
	return Number.isFinite(n) ? Math.round(n) : null;
}

export function money(fd: FormData, key: string): number | null {
	const t = text(fd, key, 32);
	if (t === null) return null;
	const n = Number(t.replace(/[£,\s]/g, ''));
	return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

export function date(fd: FormData, key: string): string | null {
	const t = text(fd, key, 10);
	if (t === null || !/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
	return Number.isNaN(Date.parse(t)) ? null : t;
}

/** Fields never echoed back to the browser (passwords, SMTP pass, tokens, API keys, secrets). Not `key_code`. */
const SECRET_FIELD = /pass|secret|token|api_key/i;

/** Form values as plain strings, for re-populating a form after a validation error. Secrets are left out. */
export function values(fd: FormData): Record<string, string> {
	const out: Record<string, string> = {};
	for (const [k, v] of fd) if (typeof v === 'string' && !SECRET_FIELD.test(k)) out[k] = v;
	return out;
}

/** A per-form message returned from an action, so the page can show it beside the right form. */
export interface FormMessage {
	error?: string;
	success?: string;
	values?: Record<string, string>;
}
export const bad = (error: string, values?: Record<string, string>): FormMessage => ({ error, values });
export const ok = (success: string): FormMessage => ({ success });
