import type { Route } from "./+types/api.users";
import { StatusCodes } from "http-status-codes";
import { sdk, applyAuth, applySessionCookie } from "@/lib/server.utils";

export async function action({ request }: Route.ActionArgs) {
    if (!["POST", "DELETE"].includes(request.method))
        throw new Response("Invalid method", { status: StatusCodes.METHOD_NOT_ALLOWED });

    if (request.method === "DELETE") {
        const { response } = await sdk.users.deleteUsersMe(await applyAuth(request));
        const headers = await applySessionCookie(response.headers);
        return new Response(null, { status: response.status, headers });
    }

    const body = (await request.json()) as { type: "Login" | "Register" } & Record<string, string>;
    const { type, Username: username, Password: password, Email: email } = body;

    if (type === "Login" && username && password) {
        const { data, error, response } = await sdk.users.postUsersMe({
            body: { identifier: username, password },
        });
        const headers = await applySessionCookie(response.headers);
        headers.set("Content-Type", "application/json");
        return new Response(JSON.stringify(data ?? error ?? null), { status: response.status, headers });
    }

    if (type === "Register" && username && password && email) {
        const { data, error, response } = await sdk.users.postUsersRegister({
            body: { email, username, password },
        });
        const headers = await applySessionCookie(response.headers);
        headers.set("Content-Type", "application/json");
        return new Response(JSON.stringify(data ?? error ?? null), { status: response.status, headers });
    }

    throw new Response("Bad Request", { status: StatusCodes.BAD_REQUEST });
}
