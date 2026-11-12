import type { MileageReading } from './types';
import { daysBetween } from './status';

/** Kinds of service-history entry. */
export const RECORD_KINDS: Record<string, string> = {
	service: 'Service',
	repair: 'Repair',
	mot: 'MOT',
	tyres: 'Tyres',
	parts: 'Parts & accessories',
	valet: 'Valet & cleaning',
	other: 'Other'
};

export const recordKindLabel = (kind: string) => RECORD_KINDS[kind] ?? 'Other';

/**
 * Average miles per year from the readings, if they span at least two months.
 * Uses the earliest and latest readings, so one-off errors in between don't matter.
 */
export function milesPerYear(readings: MileageReading[]): number | null {
	if (readings.length < 2) return null;
	const sorted = [...readings].sort((a, b) => a.date.localeCompare(b.date));
	const first = sorted[0];
	const last = sorted[sorted.length - 1];
	const days = daysBetween(first.date, last.date);
	if (days < 60 || last.mileage <= first.mileage) return null;
	return Math.round(((last.mileage - first.mileage) / days) * 365.25);
}

/** When a mileage target will be reached at the current rate, as YYYY-MM-DD. */
export function projectMileageDate(
	targetMiles: number,
	currentMiles: number | null,
	currentDate: string,
	rate: number | null
): string | null {
	if (currentMiles == null || !rate || targetMiles <= currentMiles) return null;
	const days = Math.round(((targetMiles - currentMiles) / rate) * 365.25);
	const [y, m, d] = currentDate.split('-').map(Number);
	const dt = new Date(Date.UTC(y, m - 1, d + days));
	return dt.toISOString().slice(0, 10);
}

export function formatBytes(n: number): string {
	if (n < 1024) return `${n} B`;
	if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
	return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
