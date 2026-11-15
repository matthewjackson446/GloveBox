import { costSummary } from '$lib/server/costs';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
	const summary = costSummary(locals.user!.id);
	const requested = Number(url.searchParams.get('year'));
	const thisYear = new Date().getFullYear();
	const year =
		summary.years.find((y) => y.year === requested)?.year ??
		summary.years.find((y) => y.year === thisYear)?.year ??
		summary.years[0]?.year ??
		thisYear;
	return { summary, year };
};
