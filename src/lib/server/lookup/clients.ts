import { getSetting } from '../settings';

/**
 * Clients for the DVLA Vehicle Enquiry Service and the DVSA MOT History API.
 * Each Glovebox install uses its own keys, entered by the admin under Settings → Server.
 */

export class LookupError extends Error {
	constructor(
		message: string,
		readonly status?: number
	) {
		super(message);
	}
}

/** Registrations are sent without spaces, uppercase. */
export const vrm = (reg: string) => reg.replace(/\s+/g, '').toUpperCase();

/* Test hooks only: point the clients at a mock server. Not documented for users. */
const DVLA_URL =
	process.env.GLOVEBOX_DVLA_URL ??
	'https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles';
const DVSA_URL =
	process.env.GLOVEBOX_DVSA_URL ?? 'https://history.mot.api.gov.uk/v1/trade/vehicles/registration';

export const DEFAULT_DVSA_SCOPE = 'https://tapi.dvsa.gov.uk/.default';

function connectError(e: unknown, service: string): LookupError {
	if (e instanceof LookupError) return e;
	if (e instanceof Error && e.name === 'TimeoutError') return new LookupError(`${service} didn’t respond in time.`);
	const cause = (e as { cause?: { code?: string; message?: string } })?.cause;
	return new LookupError(`Couldn’t reach ${service}${cause?.code ? ` (${cause.code})` : cause?.message ? ` (${cause.message})` : ''}.`);
}

/* ---------- DVLA ---------- */

export interface DvlaVehicle {
	registrationNumber: string;
	make?: string;
	colour?: string;
	fuelType?: string;
	engineCapacity?: number;
	yearOfManufacture?: number;
	monthOfFirstRegistration?: string;
	taxStatus?: string;
	taxDueDate?: string;
	motStatus?: string;
	motExpiry?: string;
	markedForExport?: boolean;
	co2Emissions?: number;
	euroStatus?: string;
}

export function dvlaConfigured(): boolean {
	return !!getSetting('dvla_api_key');
}

/** Returns null if DVLA has no record of that registration. */
export async function dvlaLookup(reg: string, apiKey = getSetting('dvla_api_key')): Promise<DvlaVehicle | null> {
	if (!apiKey) throw new LookupError('No DVLA API key is set up.');
	let res: Response;
	try {
		res = await fetch(DVLA_URL, {
			method: 'POST',
			headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
			body: JSON.stringify({ registrationNumber: vrm(reg) }),
			signal: AbortSignal.timeout(15_000)
		});
	} catch (e) {
		throw connectError(e, 'DVLA');
	}
	if (res.status === 404) return null;
	if (res.ok) return (await res.json()) as DvlaVehicle;
	if (res.status === 400) throw new LookupError('DVLA says that isn’t a valid registration.', 400);
	if (res.status === 401 || res.status === 403)
		throw new LookupError('DVLA rejected the API key. Check it in Settings → Server.', res.status);
	if (res.status === 429) throw new LookupError('DVLA rate limit reached. Try again later.', 429);
	throw new LookupError(`DVLA returned an error (HTTP ${res.status}).`, res.status);
}

/* ---------- DVSA ---------- */

export interface DvsaCredentials {
	clientId: string;
	clientSecret: string;
	apiKey: string;
	tokenUrl: string;
	scope: string;
}

export function dvsaCredentials(): DvsaCredentials | null {
	const clientId = getSetting('dvsa_client_id');
	const clientSecret = getSetting('dvsa_client_secret');
	const apiKey = getSetting('dvsa_api_key');
	const tokenUrl = getSetting('dvsa_token_url');
	if (!clientId || !clientSecret || !apiKey || !tokenUrl) return null;
	return { clientId, clientSecret, apiKey, tokenUrl, scope: getSetting('dvsa_scope') || DEFAULT_DVSA_SCOPE };
}

export const dvsaConfigured = () => dvsaCredentials() !== null;

let tokenCache: { key: string; token: string; expires: number } | null = null;

async function dvsaToken(c: DvsaCredentials): Promise<string> {
	const key = `${c.tokenUrl}|${c.clientId}|${c.clientSecret}`;
	if (tokenCache && tokenCache.key === key && tokenCache.expires > Date.now() + 60_000) return tokenCache.token;

	let res: Response;
	try {
		res = await fetch(c.tokenUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				grant_type: 'client_credentials',
				client_id: c.clientId,
				client_secret: c.clientSecret,
				scope: c.scope
			}),
			signal: AbortSignal.timeout(15_000)
		});
	} catch (e) {
		throw connectError(e, 'the DVSA sign-in service');
	}
	if (!res.ok)
		throw new LookupError(
			res.status === 400 || res.status === 401
				? 'DVSA rejected the client ID or secret. Check them (and the token URL) in Settings → Server. Client secrets expire after 2 years.'
				: `DVSA sign-in failed (HTTP ${res.status}).`,
			res.status
		);
	const body = (await res.json()) as { access_token?: string; expires_in?: number };
	if (!body.access_token) throw new LookupError('DVSA sign-in returned no access token.');
	tokenCache = { key, token: body.access_token, expires: Date.now() + (body.expires_in ?? 3600) * 1000 };
	return body.access_token;
}

export interface DvsaDefect {
	type: string;
	text: string;
	dangerous?: boolean;
}

export interface DvsaTest {
	completedDate: string;
	testResult: string;
	expiryDate?: string;
	odometerValue?: string;
	odometerUnit?: string;
	odometerResultType?: string;
	motTestNumber: string;
	defects?: DvsaDefect[];
}

export interface DvsaVehicle {
	registration: string;
	make?: string;
	model?: string;
	primaryColour?: string;
	fuelType?: string;
	engineSize?: string;
	firstUsedDate?: string;
	manufactureDate?: string;
	/** Present for vehicles too new to have had an MOT. */
	motTestDueDate?: string;
	motTests?: DvsaTest[];
}

/** Returns null if DVSA has no MOT record for that registration. */
export async function dvsaLookup(reg: string, creds = dvsaCredentials()): Promise<DvsaVehicle | null> {
	if (!creds) throw new LookupError('DVSA MOT history isn’t set up.');
	const token = await dvsaToken(creds);
	let res: Response;
	try {
		res = await fetch(`${DVSA_URL}/${encodeURIComponent(vrm(reg))}`, {
			headers: { Authorization: `Bearer ${token}`, 'X-API-Key': creds.apiKey, Accept: 'application/json' },
			signal: AbortSignal.timeout(15_000)
		});
	} catch (e) {
		throw connectError(e, 'DVSA');
	}
	if (res.status === 404) return null;
	if (res.ok) return (await res.json()) as DvsaVehicle;
	if (res.status === 401 || res.status === 403) {
		tokenCache = null;
		throw new LookupError('DVSA rejected the API key. Check it in Settings → Server. Keys unused for 90 days are revoked.', res.status);
	}
	if (res.status === 429) throw new LookupError('DVSA rate limit reached. Try again later.', 429);
	throw new LookupError(`DVSA returned an error (HTTP ${res.status}).`, res.status);
}
