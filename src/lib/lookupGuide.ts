/**
 * How to get your own DVLA / DVSA credentials. Shown on Settings → Server and mirrored in the README.
 * Glovebox never ships with keys: each install uses keys issued to whoever runs it.
 */

export interface GuideLink {
	label: string;
	href: string;
}

export interface Guide {
	title: string;
	gives: string;
	links: GuideLink[];
	steps: string[];
	notes: string[];
}

export const DVLA_GUIDE: Guide = {
	title: 'DVLA Vehicle Enquiry Service',
	gives: 'Make, colour, fuel, engine size and year, plus live road tax status and due date, and MOT expiry.',
	links: [
		{ label: 'Apply for a key', href: 'https://register-for-ves.driver-vehicle-licensing.api.gov.uk/' },
		{
			label: 'About the API',
			href: 'https://developer-portal.driver-vehicle-licensing.api.gov.uk/apis/vehicle-enquiry-service/vehicle-enquiry-service-description.html'
		}
	],
	steps: [
		'Open “Apply for a key” and fill in the registration form with your own name and email.',
		'When asked how you’ll use it, describe personal use, e.g. “Self-hosted app to keep track of tax and MOT dates for my own household’s vehicles.”',
		'For estimated monthly volume, choose the lowest option. Glovebox makes about one lookup per vehicle per day.',
		'DVLA emails you an API key, usually within a few working days.',
		'Paste the key below, save, then use “Test” with one of your registrations.'
	],
	notes: [
		'The key is issued to you personally. Don’t share it or put it in a public repo; DVLA can withdraw access if its terms are broken.',
		'Free of charge.'
	]
};

export const DVSA_GUIDE: Guide = {
	title: 'DVSA MOT History',
	gives: 'Full MOT history: test dates, pass/fail, recorded mileage, advisories and failures, plus the model name and MOT due date for new vehicles.',
	links: [
		{ label: 'Apply for access', href: 'https://documentation.history.mot.api.gov.uk/mot-history-api/register' },
		{ label: 'About the API', href: 'https://documentation.history.mot.api.gov.uk/' }
	],
	steps: [
		'Open “Apply for access” and complete the application form, describing personal, non-commercial use.',
		'DVSA emails you five things: a client ID, a client secret, an API key, a scope URL and a token URL.',
		'Copy each into the matching box below. The scope is normally https://tapi.dvsa.gov.uk/.default, which is already filled in.',
		'Save, then use “Test” with one of your registrations.'
	],
	notes: [
		'Client secrets expire after 2 years. DVSA lets you generate a new one, then paste it here.',
		'API keys unused for 90 days are revoked. Glovebox’s nightly refresh keeps yours active as long as you have a vehicle with auto-update on.',
		'Free of charge, and issued to you personally. Don’t share or publish them.'
	]
};
