import type { Route } from "./+types/api.paypal.$id";
import { sdk, applyAuth, forward } from "@/lib/server.utils";
import { ServerMethodNotAllowedException } from "@/lib/errors";

export async function action({ request, params }: Route.ActionArgs) {
    const auth = await applyAuth(request);
    const { id } = params;

    if (request.method === "POST" && id) {
        return forward(() => sdk.orders.postOrdersMePaypalById({ ...auth, path: { id } }));
    }
    if (request.method === "PUT" && id) {
        return forward(() => sdk.orders.putOrdersMePaypalById({ ...auth, path: { id } }));
    }
    throw new ServerMethodNotAllowedException();
}

export function loader() {
    throw new ServerMethodNotAllowedException();
}
