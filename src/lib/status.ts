import type { DueItem } from './types';

export type Status = 'overdue' | 'soon' | 'ok' | 'none';

export const SOON_DAYS = 30;
export const SOON_MILES = 1000;

const RANK: Record<Status, number> = { overdue: 0, soon: 1, ok: 2, none: 3 };

export interface ItemState {
	status: Status;
	/** Days until due (negative = overdue). Null if no date. */
	days: number | null;
	/** Miles until due (negative = overdue). Null if no mileage target or unknown mileage. */
	milesLeft: number | null;
}

/** Today's date as YYYY-MM-DD in local time. */
export function todayISO(now = new Date()): string {
	const y = now.getFullYear();
	const m = String(now.getMonth() + 1).padStart(2, '0');
	const d = String(now.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

function toUTC(iso: string): number {
	const [y, m, d] = iso.split('-').map(Number);
	return Date.UTC(y, m - 1, d);
}

export function daysBetween(fromISO: string, toISO: string): number {
	return Math.round((toUTC(toISO) - toUTC(fromISO)) / 86_400_000);
}

export function itemState(
	item: Pick<DueItem, 'due_date' | 'due_mileage'>,
	vehicleMileage: number | null,
	today = todayISO()
): ItemState {
	const days = item.due_date ? daysBetween(today, item.due_date) : null;
	const milesLeft =
		item.due_mileage != null && vehicleMileage != null ? item.due_mileage - vehicleMileage : null;

	const statuses: Status[] = [];
	if (days !== null) statuses.push(days < 0 ? 'overdue' : days <= SOON_DAYS ? 'soon' : 'ok');
	if (milesLeft !== null)
		statuses.push(milesLeft <= 0 ? 'overdue' : milesLeft <= SOON_MILES ? 'soon' : 'ok');

	return { status: worst(statuses), days, milesLeft };
}

export function worst(statuses: Status[]): Status {
	return statuses.reduce<Status>((a, b) => (RANK[b] < RANK[a] ? b : a), 'none');
}

/** Sort comparator: most urgent first. */
export function compareStates(a: ItemState, b: ItemState): number {
	if (RANK[a.status] !== RANK[b.status]) return RANK[a.status] - RANK[b.status];
	return (a.days ?? Infinity) - (b.days ?? Infinity);
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function describeState(s: ItemState): string {
	const parts: string[] = [];
	if (s.days !== null) {
		const d = s.days;
		if (d < 0) parts.push(`${plural(-d, 'day')} overdue`);
		else if (d === 0) parts.push('Due today');
		else if (d === 1) parts.push('Due tomorrow');
		else if (d <= 60) parts.push(`In ${d} days`);
		else parts.push(`In ${plural(Math.round(d / 30.44), 'month')}`);
	}
	if (s.milesLeft !== null) {
		const m = s.milesLeft;
		const n = Math.abs(m).toLocaleString('en-GB');
		parts.push(m <= 0 ? `${n} miles overdue` : `${n} miles left`);
	}
	return parts.length ? parts.join(' · ') : 'No date set';
}
