import type { Route } from "./+types/api.users";
import { StatusCodes } from "http-status-codes";
import { sdk, applyAuth, applySessionCookie } from "@/lib/server.utils";
import { type FormTypes } from "@/components/navbar/login-form";

export async function action({ request }: Route.ActionArgs) {
    if (!["POST", "DELETE", "PUT"].includes(request.method))
        throw new Response("Invalid method", { status: StatusCodes.METHOD_NOT_ALLOWED });

    const auth = await applyAuth(request);

    if (request.method === "DELETE") {
        const { response } = await sdk.users.deleteUsersMe(auth);
        const headers = await applySessionCookie(response.headers);
        return new Response(null, { status: response.status, headers });
    }

    const body = (await request.json()) as { type: FormTypes } & Record<string, string>;
    const { type, username, password, email, old_password } = body;

    if (type === "login" && username && password && request.method === "POST") {
        const { data, error, response } = await sdk.users.postUsersMe({
            ...auth,
            body: { username, password },
        });
        const headers = await applySessionCookie(response.headers);
        headers.set("Content-Type", "application/json");
        return new Response(JSON.stringify(data ?? error ?? null), { status: response.status, headers });
    }

    if (type === "register" && username && password && email && request.method === "POST") {
        const { data, error, response } = await sdk.users.postUsersRegister({
            ...auth,
            body: { email, username, password },
        });
        const headers = await applySessionCookie(response.headers);
        headers.set("Content-Type", "application/json");
        return new Response(JSON.stringify(data ?? error ?? null), { status: response.status, headers });
    }

    if (type === "change" && password && old_password && request.method === "PUT") {
        const { data, error, response } = await sdk.users.putUsersChangePassword({
            ...auth,
            body: { password, old_password },
        });
        const headers = await applySessionCookie(response.headers);
        headers.set("Content-Type", "application/json");
        return new Response(JSON.stringify(data ?? error ?? null), { status: response.status, headers });
    }

    throw new Response("Bad Request", { status: StatusCodes.BAD_REQUEST });
}
