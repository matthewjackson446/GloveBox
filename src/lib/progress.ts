import type { DueItem } from './types';
import { daysBetween, todayISO } from './status';

/** The most recent service, used as the start of the service interval. */
export interface LastService {
	date: string;
	mileage: number | null;
}

export interface IntervalProgress {
	/** 0–1 share of the interval used (1 = due or overdue). */
	fraction: number;
	/** Which measure the fraction comes from (whichever is further along). */
	basis: 'date' | 'miles';
	/** Where the interval started, for a tooltip. */
	from: string;
}

/** Same day one year earlier (29 Feb → 28 Feb). */
function yearBefore(iso: string): string {
	const [y, m, d] = iso.split('-').map(Number);
	const prev = new Date(Date.UTC(y - 1, m - 1, d));
	if (prev.getUTCMonth() !== m - 1) prev.setUTCDate(0);
	return prev.toISOString().slice(0, 10);
}

/**
 * How far through its current interval an item is.
 * The interval starts at the item's start date, the last service (for services),
 * or a year before the due date; MOT and tax always run for a year.
 * Returns null when there is nothing sensible to measure.
 */
export function intervalProgress(
	item: Pick<DueItem, 'type' | 'start_date' | 'due_date' | 'due_mileage'>,
	vehicleMileage: number | null,
	lastService: LastService | null = null,
	today = todayISO()
): IntervalProgress | null {
	const candidates: IntervalProgress[] = [];

	if (item.due_date) {
		let start: string | null = null;
		if (item.type === 'mot' || item.type === 'tax') start = yearBefore(item.due_date);
		else if (item.type === 'service' && lastService && lastService.date < item.due_date) start = lastService.date;
		else if (item.start_date && item.start_date < item.due_date) start = item.start_date;
		else if (item.type !== 'finance' && item.type !== 'other') start = yearBefore(item.due_date);

		if (start) {
			const total = daysBetween(start, item.due_date);
			const used = daysBetween(start, today);
			if (total > 0) candidates.push({ fraction: clamp(used / total), basis: 'date', from: start });
		}
	}

	if (item.due_mileage != null && vehicleMileage != null && lastService?.mileage != null) {
		const total = item.due_mileage - lastService.mileage;
		const used = vehicleMileage - lastService.mileage;
		if (total > 0) candidates.push({ fraction: clamp(used / total), basis: 'miles', from: lastService.date });
	}

	if (!candidates.length) return null;
	return candidates.reduce((a, b) => (b.fraction > a.fraction ? b : a));
}

const clamp = (n: number) => Math.min(1, Math.max(0, n));
