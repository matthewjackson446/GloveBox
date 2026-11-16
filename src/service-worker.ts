/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

/**
 * Keeps the emergency cards usable with no signal.
 *
 * - The app's own JS/CSS/icons are cached per release.
 * - Emergency card pages are fetched network-first with a short timeout and fall
 *   back to the copy saved on this device. While signed in and online, every
 *   vehicle's card is saved ahead of time (see /api/offline).
 * - Any other page opened offline falls back to the saved /emergency list.
 * - Saved cards hold policy numbers, so they're deleted on sign-out and whenever
 *   the server says the session has ended.
 */
import { build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;

const ASSETS_CACHE = `glovebox-assets-${version}`;
const CARDS_CACHE = 'glovebox-emergency';
const ASSETS = [...build, ...files.filter((f) => !f.endsWith('.webmanifest'))];
const NETWORK_TIMEOUT_MS = 3000;
/** Don't re-save every card on every page view. */
const RESYNC_MS = 10 * 60 * 1000;

const isCardPath = (p: string) => p === '/emergency' || /^\/vehicles\/\d+\/emergency$/.test(p);
const isLoginRedirect = (r: Response) => r.redirected && new URL(r.url).pathname === '/login';

sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(ASSETS_CACHE)
			.then((c) => c.addAll(ASSETS))
			.then(() => sw.skipWaiting())
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			for (const key of await caches.keys()) {
				if (key.startsWith('glovebox-assets-') && key !== ASSETS_CACHE) await caches.delete(key);
			}
			await sw.clients.claim();
		})()
	);
});

let lastSync = 0;
let syncing: Promise<void> | null = null;

/** Save every emergency card for the signed-in user. */
function syncCards(force = false): Promise<void> {
	if (syncing) return syncing;
	if (!force && Date.now() - lastSync < RESYNC_MS) return Promise.resolve();
	syncing = (async () => {
		try {
			const res = await fetch('/api/offline', { credentials: 'same-origin', cache: 'no-store' });
			if (isLoginRedirect(res)) return void (await caches.delete(CARDS_CACHE));
			if (!res.ok) return;
			const { urls } = (await res.json()) as { urls: string[] };
			const cache = await caches.open(CARDS_CACHE);
			await Promise.all(
				urls.map(async (url) => {
					const page = await fetch(url, { credentials: 'same-origin', cache: 'no-store' });
					if (page.ok && !page.redirected) await cache.put(url, page);
				})
			);
			// Drop cards for vehicles that were removed, archived or unshared.
			for (const req of await cache.keys()) {
				if (!urls.includes(new URL(req.url).pathname)) await cache.delete(req);
			}
			lastSync = Date.now();
		} catch {
			// Offline or the server is unreachable: keep what's saved.
		} finally {
			syncing = null;
		}
	})();
	return syncing;
}

sw.addEventListener('message', (event) => {
	if (event.data?.type === 'sync-emergency') event.waitUntil(syncCards(event.data.force === true));
});

/** Network first, but give up after a few seconds so a weak signal doesn't leave you waiting. */
async function cardFirst(request: Request, path: string): Promise<Response> {
	const cache = await caches.open(CARDS_CACHE);
	const network = fetch(request).then(async (res) => {
		if (isLoginRedirect(res)) {
			await caches.delete(CARDS_CACHE);
		} else if (res.ok && !res.redirected) {
			await cache.put(path, res.clone());
		}
		return res;
	});
	network.catch(() => {}); // it may still fail after we've answered from the cache
	const timeout =new Promise<null>((r) => setTimeout(() => r(null), NETWORK_TIMEOUT_MS));
	try {
		const fast = await Promise.race([network, timeout]);
		if (fast) return fast;
	} catch {
		// Network failed outright; fall through to the saved copy.
	}
	const saved = await cache.match(path);
	if (saved) return saved;
	return network.catch(() => offlinePage());
}

async function navigate(request: Request): Promise<Response> {
	try {
		return await fetch(request);
	} catch {
		const list = await caches.match('/emergency', { cacheName: CARDS_CACHE });
		return list ?? offlinePage();
	}
}

function offlinePage(): Response {
	const html = `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Offline · Glovebox</title>
<style>body{font-family:system-ui,sans-serif;margin:0;padding:24px 16px;background:#fafafa;color:#18181b}@media (prefers-color-scheme:dark){body{background:#09090b;color:#f4f4f5}p{color:#a1a1aa}}main{max-width:32rem;margin:0 auto}a.sos{display:flex;justify-content:space-between;align-items:center;background:#dc2626;color:#fff;text-decoration:none;padding:16px 20px;border-radius:16px;font-weight:700;font-size:18px}h1{font-size:22px;margin:32px 0 4px}</style></head>
<body><main><a class="sos" href="tel:999">Someone hurt or in danger? <span>Call 999</span></a>
<h1>You’re offline</h1><p>Glovebox can’t reach your server, and there are no emergency cards saved on this device yet. Open Glovebox once while you have signal and they’ll be saved for next time.</p></main></body></html>`;
	return new Response(html, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

sw.addEventListener('fetch', (event) => {
	const { request } = event;
	const url = new URL(request.url);
	if (url.origin !== sw.location.origin) return;

	// Signing out: forget the saved cards on this device.
	if (request.method === 'POST' && url.pathname === '/logout') {
		event.respondWith(caches.delete(CARDS_CACHE).then(() => fetch(request)));
		return;
	}
	if (request.method !== 'GET') return;

	if (ASSETS.includes(url.pathname)) {
		event.respondWith(caches.match(url.pathname, { cacheName: ASSETS_CACHE }).then((r) => r ?? fetch(request)));
		return;
	}
	if (request.mode === 'navigate') {
		event.respondWith(isCardPath(url.pathname) ? cardFirst(request, url.pathname) : navigate(request));
	}
});
