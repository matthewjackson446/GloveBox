/**
 * Which build is running, from the Docker build args (see Dockerfile).
 * Tagged releases show "v0.1.0"; builds from main show "edge · 0339356"; local dev shows "dev".
 */
export function appVersion(): string {
	const version = process.env.GLOVEBOX_VERSION?.trim() || 'dev';
	const revision = process.env.GLOVEBOX_REVISION?.trim().slice(0, 7);
	const label = /^\d/.test(version) ? `v${version}` : version;
	return revision && !/^\d/.test(version) ? `${label} · ${revision}` : label;
}
