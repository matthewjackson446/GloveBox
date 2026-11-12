import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter(),
		// Self-hosted users reach the app by LAN IP, hostname and reverse-proxy domain,
		// so a fixed ORIGIN doesn't work. We do our own same-host origin check in hooks.server.ts
		// (and session cookies are SameSite=Lax).
		csrf: { trustedOrigins: ['*'] }
	}
};

export default config;
