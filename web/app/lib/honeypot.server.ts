import { getClientIPAddress } from "./get-client-ip-address";

export function logHoneypot(
    request: Request,
    type: string,
    extra?: Record<string, string>,
) {
    const ip = getClientIPAddress(request.headers) ?? "unknown";
    const ua = request.headers.get("user-agent") ?? "unknown";
    const url = new URL(request.url);
    const extraStr = extra ? " " + JSON.stringify(extra) : "";
    console.warn(
        `[HONEYPOT] type=${type} ip=${ip} method=${request.method} path="${url.pathname}${url.search}" ua="${ua}"${extraStr}`,
    );
}
