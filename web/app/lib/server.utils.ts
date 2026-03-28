import { Sdk } from "./generated/sdk.gen";
import { sessionCookie } from "@/cookies.server";
import { createClient } from "./generated/client";

const getSdk = () => {
    try {
        return Sdk.__registry.get();
    } catch {
        const client = createClient({
            baseUrl: process.env.API_URL,
        });
        client.interceptors.error.use(console.error);

        return new Sdk({ client });
    }
};

export const applyAuth = async (request: Request) => {
    const session: string | null = await sessionCookie.parse(request.headers.get("Cookie"));
    return { auth: session || undefined };
};

export const applySessionCookie = async (
    sdkHeaders: Headers,
    headers: Headers = new Headers()
) => {
    const tokenHeader = sdkHeaders.get("x-session-token");
    if (!tokenHeader) return headers;
    const [token, expires] = tokenHeader.split("#");
    if (!expires) return headers;
    headers.append("Set-Cookie", await sessionCookie.serialize(token, { expires: new Date(expires) }));
    return headers;
};


export const sdk = getSdk();
