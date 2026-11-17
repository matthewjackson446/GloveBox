/** Renewals that belong to a person rather than a vehicle. */

export interface DriverItemTypeDef {
	label: string;
	/** How the due date reads, e.g. "Photocard expires". */
	dueLabel: string;
	/** Usual length in years, used to suggest the next date when renewing. */
	years: number | null;
	hint: string;
	link?: { href: string; text: string };
}

export const DRIVER_ITEM_TYPES: Record<string, DriverItemTypeDef> = {
	photocard: {
		label: 'Licence photocard',
		dueLabel: 'Photocard expires',
		years: 10,
		hint: 'The date in section 4b on the front of the card. Photocards last 10 years, and you can be fined for driving with an expired one.',
		link: { href: 'https://www.gov.uk/renew-driving-licence', text: 'Renew on GOV.UK' }
	},
	licence70: {
		label: 'Licence (70 and over)',
		dueLabel: 'Licence expires',
		years: 3,
		hint: 'From 70 your licence runs out and must be renewed every 3 years. Renewing is free.',
		link: { href: 'https://www.gov.uk/renew-driving-licence-at-70', text: 'Renew on GOV.UK' }
	},
	cpc: {
		label: 'Driver CPC',
		dueLabel: 'CPC expires',
		years: 5,
		hint: 'The date on the driver qualification card. Professional lorry, bus and coach drivers need 35 hours of training every 5 years.',
		link: { href: 'https://www.gov.uk/driver-cpc-training', text: 'About Driver CPC' }
	},
	tacho: {
		label: 'Tachograph card',
		dueLabel: 'Card expires',
		years: 5,
		hint: 'Digital tachograph driver cards last 5 years.',
		link: { href: 'https://www.gov.uk/tachograph-cards', text: 'Renew on GOV.UK' }
	},
	medical: {
		label: 'Medical (D4)',
		dueLabel: 'Medical due',
		years: 5,
		hint: 'Lorry and bus drivers need a D4 medical at 45, then every 5 years until 65, then every year.'
	},
	other: {
		label: 'Other',
		dueLabel: 'Due',
		years: 1,
		hint: 'Anything else with a date, e.g. a taxi badge or an international driving permit.'
	}
};

export const DRIVER_ITEM_ORDER = ['photocard', 'licence70', 'cpc', 'tacho', 'medical', 'other'] as const;

export const isDriverItemType = (t: string) => Object.hasOwn(DRIVER_ITEM_TYPES, t);

export function driverItemTitle(i: { type: string; label: string | null }): string {
	if (i.type === 'other') return i.label || 'Other';
	return DRIVER_ITEM_TYPES[i.type]?.label ?? i.type;
}

/** Same day `years` later (29 Feb → 28 Feb). */
export function addYears(iso: string, years: number): string {
	const [y, m, d] = iso.split('-').map(Number);
	const next = new Date(Date.UTC(y + years, m - 1, d));
	if (next.getUTCMonth() !== m - 1) next.setUTCDate(0);
	return next.toISOString().slice(0, 10);
}
