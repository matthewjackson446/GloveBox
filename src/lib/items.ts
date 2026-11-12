import type { DueItem } from './types';

/** Editable columns on a due item. */
export const ITEM_FIELDS = [
	'label',
	'provider',
	'reference',
	'emergency_phone',
	'phone',
	'website',
	'start_date',
	'due_date',
	'due_mileage',
	'cost',
	'excess',
	'notes'
] as const;

export type ItemField = (typeof ITEM_FIELDS)[number];

export interface ItemTypeDef {
	/** Display name, e.g. "Insurance". */
	label: string;
	/** Short description of the due date, e.g. "Renewal". */
	dueLabel: string;
	/** Which fields this type uses, with the label shown on the form. */
	fields: Partial<Record<ItemField, string>>;
	/** Placeholder hints for some fields. */
	hints?: Partial<Record<ItemField, string>>;
}

export const ITEM_TYPES: Record<string, ItemTypeDef> = {
	mot: {
		label: 'MOT',
		dueLabel: 'MOT expires',
		fields: {
			due_date: 'MOT expiry date',
			provider: 'Test centre',
			phone: 'Test centre phone',
			cost: 'Cost (£)',
			notes: 'Notes / advisories'
		}
	},
	tax: {
		label: 'Road tax',
		dueLabel: 'Tax due',
		fields: {
			due_date: 'Tax due date',
			cost: 'Cost (£ per year)',
			notes: 'Notes'
		},
		hints: { notes: 'e.g. Paid monthly by direct debit' }
	},
	insurance: {
		label: 'Insurance',
		dueLabel: 'Renewal',
		fields: {
			provider: 'Insurer',
			reference: 'Policy number',
			emergency_phone: 'Claims line',
			phone: 'Customer services',
			website: 'Website',
			start_date: 'Policy start',
			due_date: 'Renewal date',
			cost: 'Premium (£)',
			excess: 'Excess (£)',
			notes: 'Notes'
		},
		hints: { notes: 'Named drivers, no-claims years, broker…' }
	},
	service: {
		label: 'Service',
		dueLabel: 'Service due',
		fields: {
			due_date: 'Service due date',
			due_mileage: 'Or at mileage',
			provider: 'Garage',
			phone: 'Garage phone',
			cost: 'Expected cost (£)',
			notes: 'Notes'
		},
		hints: { notes: 'Interim / full / major, parts to replace…' }
	},
	breakdown: {
		label: 'Breakdown cover',
		dueLabel: 'Renewal',
		fields: {
			provider: 'Provider',
			reference: 'Membership number',
			emergency_phone: 'Breakdown line',
			phone: 'Customer services',
			website: 'Website',
			start_date: 'Start date',
			due_date: 'Renewal date',
			cost: 'Cost (£)',
			notes: 'Notes'
		},
		hints: { notes: 'Cover level, e.g. Roadside + Recovery + Home Start' }
	},
	warranty: {
		label: 'Warranty',
		dueLabel: 'Expires',
		fields: {
			provider: 'Warranty provider',
			reference: 'Policy number',
			emergency_phone: 'Claims line',
			phone: 'Customer services',
			website: 'Website',
			start_date: 'Start date',
			due_date: 'Expiry date',
			cost: 'Cost (£)',
			notes: 'Notes'
		}
	},
	finance: {
		label: 'Finance',
		dueLabel: 'Ends',
		fields: {
			provider: 'Finance company',
			reference: 'Agreement number',
			phone: 'Phone',
			website: 'Website',
			start_date: 'Start date',
			due_date: 'Final payment date',
			cost: 'Monthly payment (£)',
			notes: 'Notes'
		},
		hints: { notes: 'Balloon payment, mileage allowance…' }
	},
	other: {
		label: 'Other',
		dueLabel: 'Due',
		fields: {
			label: 'Name',
			provider: 'Provider',
			reference: 'Reference',
			phone: 'Phone',
			website: 'Website',
			due_date: 'Due date',
			due_mileage: 'Or at mileage',
			cost: 'Cost (£)',
			notes: 'Notes'
		},
		hints: { label: 'e.g. Parking permit, ULEZ, Dart Charge' }
	}
};

export const ITEM_TYPE_ORDER = [
	'mot',
	'tax',
	'insurance',
	'service',
	'breakdown',
	'warranty',
	'finance',
	'other'
] as const;

/** The types every vehicle is expected to have; shown as "missing" prompts. */
export const CORE_TYPES = ['mot', 'tax', 'insurance', 'service'] as const;

export function isItemType(type: string): boolean {
	return Object.hasOwn(ITEM_TYPES, type);
}

export function itemTitle(item: Pick<DueItem, 'type' | 'label'>): string {
	if (item.type === 'other') return item.label || 'Other';
	return ITEM_TYPES[item.type]?.label ?? item.type;
}
