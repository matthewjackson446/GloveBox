import { error, redirect, type Handle, type ServerInit } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { startScheduler } from '$lib/server/notify/scheduler';
import {
	SESSION_COOKIE,
	clearSessionCookie,
	setSessionCookie,
	userCount,
	validateSession
} from '$lib/server/auth';

// /calendar/<token> is authenticated by its secret token, since calendar apps can't sign in.
const PUBLIC_PATHS = ['/login', '/setup', '/api/health', '/calendar'];

/** Runs once when the server starts: apply migrations, then start the reminder scheduler. */
export const init: ServerInit = () => {
	db();
	startScheduler();
};

/**
 * Reject cross-site form posts. We can't pin a single ORIGIN (the app is reached by IP,
 * hostname and proxy domain), so require the Origin header — when sent — to match the
 * host the request arrived on, directly or via a reverse proxy.
 */
function isSameOrigin(request: Request): boolean {
	const origin = request.headers.get('origin');
	if (!origin) return true; // non-browser clients; session cookie is SameSite=Lax anyway
	let originHost: string;
	try {
		originHost = new URL(origin).host;
	} catch {
		return false;
	}
	const hosts = [request.headers.get('host'), request.headers.get('x-forwarded-host')]
		.flatMap((h) => (h ? h.split(',') : []))
		.map((h) => h.trim());
	return hosts.includes(originHost);
}

export const handle: Handle = async ({ event, resolve }) => {
	const { request, url } = event;

	if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method) && !isSameOrigin(request)) {
		error(403, 'Cross-site request blocked');
	}

	event.locals.user = null;
	event.locals.sessionToken = null;

	const token = event.cookies.get(SESSION_COOKIE);
	if (token) {
		const session = validateSession(token);
		if (session) {
			event.locals.user = session.user;
			event.locals.sessionToken = token;
			if (session.renewed) setSessionCookie(event, token, session.renewed);
		} else {
			clearSessionCookie(event);
		}
	}

	const path = url.pathname;
	const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + '/'));

	if (path !== '/api/health') {
		const firstRun = userCount() === 0;
		if (firstRun && path !== '/setup') redirect(303, '/setup');
		if (!firstRun && path === '/setup') redirect(303, '/login');
	}

	if (!isPublic && !event.locals.user) {
		const next = path === '/' ? '' : `?next=${encodeURIComponent(path + url.search)}`;
		redirect(303, `/login${next}`);
	}

	const response = await resolve(event);
	response.headers.set('X-Frame-Options', 'SAMEORIGIN');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'same-origin');
	return response;
};
