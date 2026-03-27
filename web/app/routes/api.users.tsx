import { sessionCookie } from "@/cookies.server";
import type { Route } from "./+types/api.users";
import { getClient } from "@/lib/utils";
import { StatusCodes } from "http-status-codes";

export async function action({ request }: Route.ActionArgs) {
    if (!["POST", "DELETE"].includes(request.method))
        throw new Response("Invalid method", { status: StatusCodes.METHOD_NOT_ALLOWED });

    const client = getClient();
    const cookieHeader = request.headers.get("Cookie");
    const session = await sessionCookie.parse(cookieHeader);

    if (request.method === "DELETE") {
        const { response } = await client.DELETE("/users/me", {
            params: { cookie: { "__Host-session": session } },
        });
        const headers = new Headers();
        const setCookie = response.headers.get("Set-Cookie");
        if (setCookie) headers.set("Set-Cookie", setCookie);
        return new Response(null, { status: response.status, headers });
    }

    const body = (await request.json()) as { type: "Login" | "Register" } & Record<string, string>;
    const type = body.type,
        username = body.Username,
        password = body.Password,
        email = body.Email;

    if (type === "Login" && username && password) {
        const { data, error, response } = await client.POST("/users/me", {
            body: { identifier: username, password },
        });
        const headers = new Headers({ "Content-Type": "application/json" });
        const setCookie = response.headers.get("Set-Cookie");
        if (setCookie) headers.set("Set-Cookie", setCookie);
        return new Response(JSON.stringify(data ?? error ?? null), { status: response.status, headers });
    }

    if (type === "Register" && username && password && email) {
        const { data, error, response } = await client.POST("/users/register", {
            body: { email, username, password },
        });
        const headers = new Headers({ "Content-Type": "application/json" });
        const setCookie = response.headers.get("Set-Cookie");
        if (setCookie) headers.set("Set-Cookie", setCookie);
        return new Response(JSON.stringify(data ?? error ?? null), { status: response.status, headers });
    }

    throw new Response("Bad Request", { status: StatusCodes.BAD_REQUEST });
}
