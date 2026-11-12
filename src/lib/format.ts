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

/** SQLite `datetime('now')` (UTC, "YYYY-MM-DD HH:MM:SS") → "12 Nov, 14:05" in local time. */
export function formatTimestamp(sql: string | null | undefined): string {
	if (!sql) return '—';
	const d = new Date(sql.includes('T') ? sql : sql.replace(' ', 'T') + 'Z');
	return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
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
