import { sessionCookie } from "@/lib/security.server";
import { ServerException } from "./errors";
import type { Config } from "./generated/client";


export const getAuth = async (request: Request): Promise<{ auth: Config["auth"]; }> => {
    const session: string | null = await sessionCookie.parse(request.headers.get("Cookie"));
    return {
        auth: (auth) => {
            if (auth.name === "X-Session-Token") return session || undefined;
            else if (auth.name === "X-Application-Token") return process.env.APPLICATION_TOKEN;
            return undefined;
        }
    };
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


export async function forward<T, E>(
    call: () => Promise<{ data?: T; error?: E; response: Response; }>,
    raw: true,
): Promise<T>;
export async function forward<T, E>(
    call: () => Promise<{ data?: T; error?: E; response: Response; }>,
    raw?: false,
): Promise<Response>;
export async function forward<T, E>(
    call: () => Promise<{ data?: T; error?: E; response: Response; }>,
    raw: boolean = false,
): Promise<Response | T> {
    const { data, error, response } = await call();
    if (error) throw ServerException.fromJson(error).toResponse();
    if (raw) return data!;
    const headers = await applySessionCookie(response.headers);
    return data === undefined || [
        204, 205, 304
    ].includes(response.status) || response.status < 200
        ? new Response(null, { status: response.status, headers })
        : Response.json(data, { status: response.status, headers });
}
