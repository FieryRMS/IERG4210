import type { Route } from "./+types/api.paypal.$id";
import { sdk, getAuth, forward } from "@/lib/server.utils";
import { ServerMethodNotAllowedException } from "@/lib/errors";

export async function action({ request, params }: Route.ActionArgs) {
    const auth = await getAuth(request);
    const { id } = params;

    if (request.method === "POST" && id) {
        return forward(() => sdk.paypal.postPaypalMeById({ ...auth, path: { id } }));
    }
    if (request.method === "PUT" && id) {
        return forward(() => sdk.paypal.putPaypalMeById({ ...auth, path: { id } }));
    }
    throw new ServerMethodNotAllowedException();
}

export function loader() {
    throw new ServerMethodNotAllowedException();
}
