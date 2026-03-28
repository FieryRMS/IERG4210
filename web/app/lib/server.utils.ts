import { Sdk } from "./client/sdk.gen";
import { sessionCookie } from "@/cookies.server";

const getSdk = () => {
    try {
        return Sdk.__registry.get();
    } catch {
        return new Sdk();
    }
};

export const applyAuth = async (request: Request) => {
    const session: string | null = await sessionCookie.parse(request.headers.get("Cookie"));
    return { auth: session || undefined };
};

export const applySessionCookie = async (
    sdkHeaders: Headers,
    headers: Headers = new Headers()
): Promise<Headers> => {
    const tokenHeader = sdkHeaders.get("x-session-token");
    if (!tokenHeader) return headers;
    const colonIdx = tokenHeader.indexOf(":");
    if (colonIdx === -1) return headers;
    const token = tokenHeader.slice(0, colonIdx);
    const expires = new Date(tokenHeader.slice(colonIdx + 1));
    headers.append("Set-Cookie", await sessionCookie.serialize(token, { expires }));
    return headers;
};


export const sdk = getSdk();
