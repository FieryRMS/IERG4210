import type { Route } from "./+types/api.me.($type)";
import { sdk, applyAuth, forward } from "@/lib/server.utils";
import { ServerBadRequestException, ServerMethodNotAllowedException } from "@/lib/errors";

export async function action({ request, params }: Route.ActionArgs) {
    if (!["POST", "DELETE", "PUT"].includes(request.method)) throw new ServerMethodNotAllowedException();

    const auth = await applyAuth(request);

    if (request.method === "DELETE") {
        return forward(() => sdk.users.deleteUsersMe(auth));
    }

    const body = await request.json();
    const type = params.type;
    const { username, password, email, old_password } = body;

    if (type === "login" && username && password && request.method === "POST")
        return forward(() => sdk.users.postUsersMe({ ...auth, body: { username, password } }));

    if (type === "register" && username && password && email && request.method === "POST")
        return forward(() => sdk.users.postUsersRegister({ ...auth, body: { email, username, password } }));

    if (type === "change" && password && old_password && request.method === "PUT")
        return forward(() => sdk.users.putUsersChangePassword({ ...auth, body: { password, old_password } }));

    throw new ServerBadRequestException();
}

export function loader() {
    throw new ServerMethodNotAllowedException();
}
