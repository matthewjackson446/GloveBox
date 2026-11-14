import { error } from '@sveltejs/kit';
import { buildCalendar, userForToken } from '$lib/server/calendar';
import type { RequestHandler } from './$types';

/**
 * Private calendar feed: /calendar/<token>.ics
 * Calendar apps can't sign in, so the secret token in the URL is the authentication.
 */
export const GET: RequestHandler = ({ params }) => {
	const token = params.token.replace(/\.ics$/, '');
	const user = userForToken(token);
	if (!user) error(404, 'Calendar not found. The link may have been reset.');
	return new Response(buildCalendar(user.id), {
		headers: {
			'Content-Type': 'text/calendar; charset=utf-8',
			'Content-Disposition': 'inline; filename="glovebox.ics"',
			'Cache-Control': 'private, no-cache',
			'X-Robots-Tag': 'noindex'
		}
	});
};
