/**
 * Clean air zone compliance and road tax (VED) band, worked out from what DVLA
 * tells us. These are guides, not official answers: the UI always links to the
 * official checkers, and never quotes prices (VED rates change every April).
 */
import type { Vehicle } from './types';

export type VehicleClass = 'car' | 'van' | 'motorcycle';
export const VEHICLE_CLASSES: Record<VehicleClass, string> = { car: 'Car', van: 'Van', motorcycle: 'Motorcycle' };

type Facts = Pick<Vehicle, 'fuel_type' | 'first_registered' | 'year' | 'co2_emissions' | 'euro_status' | 'vehicle_class' | 'engine_cc'>;

/** DVLA typeApproval → our class. M1 cars, N1 light vans, L motorcycles. */
export function classFromTypeApproval(t: string | undefined | null): VehicleClass | null {
	if (!t) return null;
	const s = t.toUpperCase();
	if (s.startsWith('M1')) return 'car';
	if (s.startsWith('N1')) return 'van';
	if (s.startsWith('L')) return 'motorcycle';
	return null;
}

/** "EURO 6", "Euro 6d-TEMP", "EURO6" → 6. */
export function euroNumber(s: string | null | undefined): number | null {
	const m = s?.match(/(\d)/);
	return m ? Number(m[1]) : null;
}

type Fuel = 'electric' | 'petrol' | 'diesel' | 'hybrid' | 'unknown';

function fuelKind(f: string | null): Fuel {
	if (!f) return 'unknown';
	const s = f.toLowerCase();
	if (s.includes('hybrid')) return 'hybrid';
	if (s.includes('electric') || s.includes('hydrogen') || s.includes('fuel cell')) return 'electric';
	if (s.includes('diesel')) return 'diesel';
	if (s.includes('petrol') || s.includes('gas') || s.includes('lpg')) return 'petrol';
	return 'unknown';
}

/* ---------- clean air zones ---------- */

export type CleanAirVerdict = 'meets' | 'likely' | 'check' | 'likely-not' | 'not' | 'unknown';

export interface CleanAirResult {
	verdict: CleanAirVerdict;
	headline: string;
	detail: string;
}

/**
 * From when most new vehicles met the standard (Euro 4 petrol, Euro 6 diesel,
 * Euro 3 motorcycles), as YYYY-MM. Earlier ones may still meet it, so in the
 * grey years we say "check" rather than "no".
 */
const FROM: Record<VehicleClass, { petrol: string; diesel: string; greyFrom: { petrol: string; diesel: string } }> = {
	car: { petrol: '2006-01', diesel: '2015-09', greyFrom: { petrol: '2001-01', diesel: '2014-01' } },
	van: { petrol: '2007-01', diesel: '2016-09', greyFrom: { petrol: '2001-01', diesel: '2015-01' } },
	motorcycle: { petrol: '2007-07', diesel: '2007-07', greyFrom: { petrol: '2006-01', diesel: '2006-01' } }
};
const NEEDS: Record<'petrol' | 'diesel' | 'motorcycle', number> = { petrol: 4, diesel: 6, motorcycle: 3 };

/** Registration month if we have it, else the build year (less precise). */
function when(v: Facts): { ym: string; exact: boolean } | null {
	if (v.first_registered) return { ym: v.first_registered, exact: true };
	if (v.year) return { ym: `${v.year}-06`, exact: false };
	return null;
}

export function cleanAir(v: Facts, today = new Date()): CleanAirResult {
	const cls = (v.vehicle_class as VehicleClass | null) ?? 'car';
	const fuel = fuelKind(v.fuel_type);

	if (fuel === 'electric') {
		return { verdict: 'meets', headline: 'Meets the standard', detail: 'Zero-emission vehicles aren’t charged in clean air zones.' };
	}
	if (isHistoric(v, today)) {
		return {
			verdict: 'likely',
			headline: 'Exempt if taxed as historic',
			detail: `Built in ${v.year}. London’s ULEZ doesn’t charge vehicles in the historic vehicle tax class. Other zones have their own rules for historic vehicles, so check before you go.`
		};
	}

	const euro = euroNumber(v.euro_status);
	if (euro !== null && fuel !== 'unknown') {
		const need = cls === 'motorcycle' ? NEEDS.motorcycle : fuel === 'diesel' ? NEEDS.diesel : NEEDS.petrol;
		if (euro >= need) {
			const who = cls === 'motorcycle' ? 'motorcycles' : `${fuel === 'hybrid' ? 'petrol hybrid' : fuel} ${cls === 'van' ? 'vans' : 'cars'}`;
			return { verdict: 'meets', headline: 'Meets the standard', detail: `It’s ${v.euro_status}, and ${who} need Euro ${need}.` };
		}
		if (fuel === 'hybrid' && euro >= NEEDS.petrol)
			return { verdict: 'check', headline: 'Depends on the engine', detail: `${v.euro_status} is enough for a petrol hybrid but not a diesel hybrid, which needs Euro 6.` };
		return { verdict: 'not', headline: 'Likely to be charged', detail: `${v.euro_status} is below the ${fuel === 'diesel' ? 'Euro 6' : 'Euro 4'} standard.` };
	}

	const w = when(v);
	if (!w || fuel === 'unknown') {
		return { verdict: 'unknown', headline: 'Not enough to go on', detail: 'Add the fuel type and when it was first registered to see an estimate.' };
	}

	const base = fuel === 'hybrid' ? 'petrol' : fuel;
	const from = FROM[cls][base];
	const grey = FROM[cls].greyFrom[base];
	const need = cls === 'motorcycle' ? 'Euro 3' : base === 'diesel' ? 'Euro 6' : 'Euro 4';
	const kind = cls === 'motorcycle' ? 'motorcycles' : `${base} ${cls === 'van' ? 'vans' : 'cars'}`;
	const its = w.exact ? `It was first registered in ${monthName(w.ym)}` : `It was built in ${v.year}`;
	const estimate = w.exact ? '' : ' (estimated from the build year; add the first registration month for a better guess)';

	if (w.ym >= from) {
		if (fuel === 'hybrid' && cls !== 'motorcycle')
			return w.ym < FROM[cls].diesel
				? { verdict: 'likely', headline: 'Likely meets the standard', detail: `${its}. A petrol hybrid that age almost certainly meets Euro 4, but a diesel hybrid would need Euro 6${estimate}.` }
				: { verdict: 'likely', headline: 'Likely meets the standard', detail: `${its}. Hybrids that age almost always meet the standard, whether petrol (Euro 4) or diesel (Euro 6)${estimate}.` };
		return { verdict: 'likely', headline: 'Likely meets the standard', detail: `${its}, and almost all ${kind} from ${monthName(from)} on meet ${need}${estimate}.` };
	}
	if (w.ym >= grey) {
		return { verdict: 'check', headline: 'Check before you drive in', detail: `${its}. Some ${kind} that age meet ${need} and some don’t${estimate}.` };
	}
	return { verdict: 'likely-not', headline: 'Likely to be charged', detail: `${its}, and very few ${kind} registered before ${monthName(grey)} meet ${need}${estimate}.` };
}

/* ---------- road tax band ---------- */

export interface TaxBand {
	label: string;
	detail: string;
}

/** 2001–2017 car bands by CO₂ (g/km). Band K also covers over 225 g/km before 23 March 2006. */
const BANDS: [string, number, number][] = [
	['A', 0, 100],
	['B', 101, 110],
	['C', 111, 120],
	['D', 121, 130],
	['E', 131, 140],
	['F', 141, 150],
	['G', 151, 165],
	['H', 166, 175],
	['I', 176, 185],
	['J', 186, 200],
	['K', 201, 225],
	['L', 226, 255],
	['M', 256, Infinity]
];

export function co2Band(co2: number, firstRegistered: string): { band: string; range: string } {
	if (co2 > 225 && firstRegistered < '2006-03') return { band: 'K', range: 'over 225 g/km, registered before 23 March 2006' };
	const [band, lo, hi] = BANDS.find(([, lo, hi]) => co2 >= lo && co2 <= hi) ?? BANDS[BANDS.length - 1];
	return { band, range: hi === Infinity ? `over ${lo - 1} g/km` : lo === 0 ? `up to ${hi} g/km` : `${lo}–${hi} g/km` };
}

/** UK tax years run from April, and historic status rolls forward each 1 April. */
function taxYear(today: Date): number {
	return today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
}

/** Historic vehicle tax class: built before 1 January, 40 years before the current tax year. */
function isHistoric(v: Facts, today: Date): boolean {
	return !!v.year && v.year <= taxYear(today) - 41;
}

export function taxBand(v: Facts, today = new Date()): TaxBand | null {
	const cls = (v.vehicle_class as VehicleClass | null) ?? 'car';
	const w = when(v);

	if (isHistoric(v, today)) {
		return { label: 'Historic vehicle (exempt)', detail: `Built in ${v.year}, so it can be taxed as a historic vehicle for free. You still need to tax it, choosing the historic vehicle tax class.` };
	}
	if (cls === 'van') return { label: 'Light goods vehicle rate', detail: 'Vans pay a flat yearly rate, whatever their emissions.' };
	if (cls === 'motorcycle') {
		const cc = v.engine_cc;
		const size = cc == null ? null : cc <= 150 ? 'up to 150cc' : cc <= 400 ? '151–400cc' : cc <= 600 ? '401–600cc' : 'over 600cc';
		return { label: size ? `Motorcycle, ${size}` : 'Motorcycle rate', detail: 'Motorcycles are taxed by engine size.' };
	}
	if (!w) return null;
	const since = w.exact ? `first registered ${monthName(w.ym)}` : `built in ${v.year}`;

	if (w.ym < '2001-03') {
		if (v.engine_cc == null) return { label: 'Taxed by engine size', detail: `Cars ${since} are taxed by engine size. Add the engine size to see which rate.` };
		return {
			label: v.engine_cc <= 1549 ? 'Engine up to 1,549cc' : 'Engine over 1,549cc',
			detail: `Cars registered before March 2001 are taxed by engine size (${v.engine_cc.toLocaleString('en-GB')}cc).`
		};
	}
	if (w.ym < '2017-04') {
		if (v.co2_emissions == null) return { label: 'Taxed by CO₂ band', detail: `Cars ${since} are taxed by CO₂. Add the CO₂ figure to see the band.` };
		const { band, range } = co2Band(v.co2_emissions, w.ym);
		return { label: `Band ${band}`, detail: `${v.co2_emissions} g/km (${range}). Cars registered March 2001 to March 2017 are taxed by CO₂ band.` };
	}

	// April 2017 onwards: a flat standard rate, plus a supplement in years 2–6 for list prices over £40,000.
	const [y, m] = w.ym.split('-').map(Number);
	const supplementEnds = `${y + 6}-${String(m).padStart(2, '0')}`;
	const now = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
	return {
		label: 'Standard rate',
		detail:
			now >= supplementEnds
				? 'Cars registered from April 2017 pay a flat standard rate. It’s past the five years when the expensive car supplement applies.'
				: `Cars registered from April 2017 pay a flat standard rate. If its list price was over £40,000, it also pays the expensive car supplement until ${monthName(supplementEnds)}.`
	};
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export function monthName(ym: string): string {
	const [y, m] = ym.split('-').map(Number);
	return `${MONTHS[m - 1] ?? ''} ${y}`.trim();
}
