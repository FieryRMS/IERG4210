import { isIP } from "is-ip";
import { getHeaders } from "./get-headers.js";

const TRUSTED_PROXIES = parseInt(process.env.TRUSTED_PROXIES ?? "1", 10);

export function getClientIPAddress(headers: Pick<Headers, "get">): string | null;
export function getClientIPAddress(request: Request): string | null;
export function getClientIPAddress(requestOrHeaders: Request | Pick<Headers, "get">): string | null {
	const headers = getHeaders(requestOrHeaders);

	const xff = headers.get("X-Forwarded-For");
	if (!xff) return null;

	const parts = xff.split(",").map((s) => s.trim()).filter(Boolean);
	const target = parts[parts.length - TRUSTED_PROXIES];
	if (target && isIP(target)) return target;
	return null;
}
