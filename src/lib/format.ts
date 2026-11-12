const dateFmt = new Intl.DateTimeFormat('en-GB', {
	day: 'numeric',
	month: 'short',
	year: 'numeric',
	timeZone: 'UTC'
});
const moneyFmt = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });
const numberFmt = new Intl.NumberFormat('en-GB');

export function formatDate(iso: string | null | undefined): string {
	if (!iso) return '—';
	const [y, m, d] = iso.split('-').map(Number);
	return dateFmt.format(new Date(Date.UTC(y, m - 1, d)));
}

export function formatMoney(n: number | null | undefined): string {
	return n == null ? '—' : moneyFmt.format(n);
}

export function formatMiles(n: number | null | undefined): string {
	return n == null ? '—' : `${numberFmt.format(n)} mi`;
}

/** "Ford Fiesta" / nickname fallback. */
export function vehicleName(v: {
	nickname: string | null;
	make: string | null;
	model: string | null;
}): string {
	const makeModel = [v.make, v.model].filter(Boolean).join(' ');
	return v.nickname || makeModel || 'Unnamed vehicle';
}

/** Strip spaces etc. so phone numbers work in tel: links. */
export function telHref(phone: string): string {
	return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

export function websiteHref(url: string): string {
	return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}
