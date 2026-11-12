import nodemailer from 'nodemailer';
import { db } from '../db';
import { isValidEmail, normaliseEmail } from '../auth';
import { text } from '../form';
import { getSmtp } from '../settings';

export const CHANNEL_TYPES = {
	email: 'Email',
	ntfy: 'ntfy',
	gotify: 'Gotify',
	discord: 'Discord',
	webhook: 'Webhook'
} as const;

export type ChannelType = keyof typeof CHANNEL_TYPES;
type Config = Record<string, string>;

export interface ChannelRow {
	id: number;
	user_id: number;
	type: ChannelType;
	name: string;
	config: string;
	enabled: number;
	last_error: string | null;
	last_sent_at: string | null;
	created_at: string;
}

/** What the browser is allowed to see about a channel: no tokens or secret URLs. */
export interface ChannelSummary {
	id: number;
	type: ChannelType;
	typeLabel: string;
	name: string;
	target: string;
	enabled: boolean;
	last_error: string | null;
	last_sent_at: string | null;
}

export interface Message {
	title: string;
	text: string;
	html?: string;
	url?: string | null;
	/** Something is overdue or due within a week. */
	urgent?: boolean;
}

/* ---------- validation ---------- */

function httpUrl(value: string | null): URL | null {
	if (!value) return null;
	try {
		const u = new URL(value);
		return u.protocol === 'http:' || u.protocol === 'https:' ? u : null;
	} catch {
		return null;
	}
}

const baseUrl = (u: URL) => u.toString().replace(/\/+$/, '');

export function parseChannelForm(
	fd: FormData
): { type: ChannelType; name: string; config: Config } | { error: string } {
	const type = fd.get('type') as ChannelType;
	if (!Object.hasOwn(CHANNEL_TYPES, type)) return { error: 'Choose a channel type.' };
	const get = (k: string) => text(fd, k, 500);
	const name = text(fd, 'name', 60);

	switch (type) {
		case 'email': {
			const to = normaliseEmail(get('to') ?? '');
			if (!isValidEmail(to)) return { error: 'Enter a valid email address.' };
			return { type, name: name ?? to, config: { to } };
		}
		case 'ntfy': {
			const server = httpUrl(get('server') ?? 'https://ntfy.sh');
			if (!server) return { error: 'Enter a valid ntfy server URL.' };
			const topic = get('topic') ?? '';
			if (!/^[\w-]{1,64}$/.test(topic))
				return { error: 'Topic must be letters, numbers, - or _ (max 64).' };
			const token = get('token');
			return {
				type,
				name: name ?? `ntfy · ${topic}`,
				config: { server: baseUrl(server), topic, ...(token ? { token } : {}) }
			};
		}
		case 'gotify': {
			const server = httpUrl(get('server'));
			if (!server) return { error: 'Enter your Gotify server URL.' };
			const token = get('token');
			if (!token) return { error: 'Enter a Gotify application token.' };
			return { type, name: name ?? 'Gotify', config: { server: baseUrl(server), token } };
		}
		case 'discord': {
			const url = httpUrl(get('url'));
			if (!url || !/^https:\/\/(canary\.|ptb\.)?(discord|discordapp)\.com\/api\/webhooks\//.test(url.toString()))
				return { error: 'Paste a Discord webhook URL (https://discord.com/api/webhooks/…).' };
			return { type, name: name ?? 'Discord', config: { url: url.toString() } };
		}
		case 'webhook': {
			const url = httpUrl(get('url'));
			if (!url) return { error: 'Enter a valid http(s) URL.' };
			return { type, name: name ?? `Webhook · ${url.host}`, config: { url: url.toString() } };
		}
	}
}

/** A description safe to show in the UI. */
function describeTarget(type: ChannelType, c: Config): string {
	switch (type) {
		case 'email':
			return c.to;
		case 'ntfy':
			return `${new URL(c.server).host}/${c.topic}${c.token ? ' · with access token' : ''}`;
		case 'gotify':
			return new URL(c.server).host;
		case 'discord':
			return 'Discord webhook';
		case 'webhook':
			return `${new URL(c.url).origin}/…`;
	}
}

/* ---------- storage ---------- */

export function listChannels(userId: number): ChannelRow[] {
	return db()
		.prepare('SELECT * FROM notification_channels WHERE user_id = ? ORDER BY id')
		.all(userId) as ChannelRow[];
}

export function summarise(c: ChannelRow): ChannelSummary {
	let target = '';
	try {
		target = describeTarget(c.type, JSON.parse(c.config));
	} catch {
		target = '(invalid settings)';
	}
	return {
		id: c.id,
		type: c.type,
		typeLabel: CHANNEL_TYPES[c.type],
		name: c.name,
		target,
		enabled: c.enabled === 1,
		last_error: c.last_error,
		last_sent_at: c.last_sent_at
	};
}

export function getChannel(id: number, userId: number): ChannelRow | undefined {
	return db()
		.prepare('SELECT * FROM notification_channels WHERE id = ? AND user_id = ?')
		.get(id, userId) as ChannelRow | undefined;
}

export function createChannel(userId: number, type: ChannelType, name: string, config: Config) {
	db()
		.prepare('INSERT INTO notification_channels (user_id, type, name, config) VALUES (?, ?, ?, ?)')
		.run(userId, type, name, JSON.stringify(config));
}

export function deleteChannel(id: number, userId: number) {
	db().prepare('DELETE FROM notification_channels WHERE id = ? AND user_id = ?').run(id, userId);
}

export function setChannelEnabled(id: number, userId: number, enabled: boolean) {
	db()
		.prepare('UPDATE notification_channels SET enabled = ? WHERE id = ? AND user_id = ?')
		.run(enabled ? 1 : 0, id, userId);
}

function recordResult(id: number, error: string | null) {
	if (error) {
		db().prepare('UPDATE notification_channels SET last_error = ? WHERE id = ?').run(error.slice(0, 300), id);
	} else {
		db()
			.prepare(`UPDATE notification_channels SET last_error = NULL, last_sent_at = datetime('now') WHERE id = ?`)
			.run(id);
	}
}

/* ---------- sending ---------- */

function errorMessage(e: unknown): string {
	if (e instanceof Error) {
		if (e.name === 'TimeoutError') return 'Timed out after 15 seconds';
		// Node's fetch hides the useful part ("ECONNREFUSED", "ENOTFOUND") in error.cause.
		type Cause = { code?: string; message?: string; errors?: { code?: string }[] };
		const cause = (e as Error & { cause?: Cause }).cause;
		const code = cause?.code ?? cause?.errors?.find((x) => x.code)?.code;
		const hints: Record<string, string> = {
			ECONNREFUSED: 'connection refused (is the server running?)',
			ENOTFOUND: 'host not found (check the address)',
			ETIMEDOUT: 'timed out',
			ECONNRESET: 'connection reset'
		};
		if (code) return `Couldn’t connect: ${hints[code] ?? code}`;
		if (cause?.message) return `Couldn’t connect: ${cause.message}`;
		return e.message;
	}
	return String(e);
}

async function post(url: string, init: { headers?: Record<string, string>; body: string }, label: string) {
	const res = await fetch(url, {
		method: 'POST',
		headers: init.headers,
		body: init.body,
		signal: AbortSignal.timeout(15_000),
		redirect: 'error'
	});
	// Only the status is reported back, never the response body.
	if (!res.ok) throw new Error(`${label} returned HTTP ${res.status}`);
}

const withLink = (msg: Message) => (msg.url ? `${msg.text}\n\n${msg.url}` : msg.text);

async function send(type: ChannelType, c: Config, msg: Message): Promise<void> {
	switch (type) {
		case 'email': {
			const smtp = getSmtp();
			if (!smtp) throw new Error('Email isn’t set up on this server yet. An admin can add SMTP details under Settings → Server.');
			const transport = nodemailer.createTransport({
				host: smtp.host,
				port: smtp.port,
				secure: smtp.security === 'tls',
				requireTLS: smtp.security === 'starttls',
				ignoreTLS: smtp.security === 'none',
				auth: smtp.user ? { user: smtp.user, pass: smtp.pass ?? '' } : undefined,
				connectionTimeout: 15_000,
				greetingTimeout: 15_000,
				socketTimeout: 20_000
			});
			await transport.sendMail({
				from: smtp.from,
				to: c.to,
				subject: msg.title,
				text: withLink(msg),
				html: msg.html
			});
			return;
		}
		case 'ntfy':
			// JSON publishing avoids non-ASCII header problems with titles.
			return post(
				c.server,
				{
					headers: {
						'Content-Type': 'application/json',
						...(c.token ? { Authorization: `Bearer ${c.token}` } : {})
					},
					body: JSON.stringify({
						topic: c.topic,
						title: msg.title,
						message: msg.text,
						priority: msg.urgent ? 4 : 3,
						tags: ['car'],
						...(msg.url ? { click: msg.url } : {})
					})
				},
				'ntfy'
			);
		case 'gotify':
			return post(
				`${c.server}/message`,
				{
					headers: { 'Content-Type': 'application/json', 'X-Gotify-Key': c.token },
					body: JSON.stringify({
						title: msg.title,
						message: withLink(msg),
						priority: msg.urgent ? 8 : 5,
						...(msg.url ? { extras: { 'client::notification': { click: { url: msg.url } } } } : {})
					})
				},
				'Gotify'
			);
		case 'discord':
			return post(
				c.url,
				{
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						username: 'Glovebox',
						content: `**${msg.title}**\n${withLink(msg)}`.slice(0, 1990)
					})
				},
				'Discord'
			);
		case 'webhook':
			return post(
				c.url,
				{
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						source: 'glovebox',
						title: msg.title,
						message: msg.text,
						url: msg.url ?? null,
						urgent: !!msg.urgent
					})
				},
				'Webhook'
			);
	}
}

/** Send to one channel, recording success/failure on it. Never throws. */
export async function deliver(channel: ChannelRow, msg: Message): Promise<{ ok: boolean; error?: string }> {
	try {
		await send(channel.type, JSON.parse(channel.config), msg);
		recordResult(channel.id, null);
		return { ok: true };
	} catch (e) {
		const error = errorMessage(e);
		recordResult(channel.id, error);
		console.error(`[glovebox] notification via ${channel.type} #${channel.id} failed: ${error}`);
		return { ok: false, error };
	}
}

/** Send an email directly (used for the admin's SMTP test). Throws on failure. */
export async function sendTestEmail(to: string, msg: Message) {
	try {
		await send('email', { to }, msg);
	} catch (e) {
		throw new Error(errorMessage(e));
	}
}
