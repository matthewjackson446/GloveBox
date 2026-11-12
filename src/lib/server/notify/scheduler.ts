import { todayISO } from '$lib/status';
import { getSetting, reminderHour, setSettings } from '../settings';
import { runReminders } from './reminders';

export const LAST_RUN_KEY = 'reminders_last_run';
const CHECK_EVERY = 5 * 60_000;

/**
 * Checks every few minutes whether today's reminder run is due (we're past the configured
 * hour and haven't run today). Catches up after a restart, and never runs twice a day.
 */
export function startScheduler() {
	if (process.env.GLOVEBOX_DISABLE_SCHEDULER === 'true') {
		console.log('[glovebox] reminder scheduler disabled');
		return;
	}
	const g = globalThis as { __gloveboxScheduler?: ReturnType<typeof setInterval> };
	if (g.__gloveboxScheduler) clearInterval(g.__gloveboxScheduler); // dev hot reload

	const tick = async () => {
		try {
			const now = new Date();
			const today = todayISO(now);
			if (now.getHours() < reminderHour() || getSetting(LAST_RUN_KEY) === today) return;
			setSettings({ [LAST_RUN_KEY]: today });
			const s = await runReminders(today);
			console.log(
				`[glovebox] reminders: ${s.reminders} for ${s.users} user(s), ${s.delivered} delivered, ${s.failed} failed`
			);
		} catch (e) {
			console.error('[glovebox] reminder run failed', e);
		}
	};

	g.__gloveboxScheduler = setInterval(tick, CHECK_EVERY);
	setTimeout(tick, 10_000);
	console.log(`[glovebox] reminder scheduler started (daily at ${String(reminderHour()).padStart(2, '0')}:00, TZ=${process.env.TZ ?? Intl.DateTimeFormat().resolvedOptions().timeZone})`);
}
