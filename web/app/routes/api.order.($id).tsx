import type { Route } from "./+types/api.order.($id)";
import { sdk, getAuth, forward } from "@/lib/server.utils";
import { ServerMethodNotAllowedException } from "@/lib/errors";

export async function action({ request, params }: Route.ActionArgs) {
    const auth = await getAuth(request);
    const { id } = params;

    if (request.method === "POST") {
        const body = await request.json();
        return forward(() => sdk.orders.postOrdersMe({ ...auth, body }));
    }
    if (request.method === "DELETE" && id) {
        return forward(() => sdk.orders.deleteOrdersMeById({ ...auth, path: { id } }));
    }
    throw new ServerMethodNotAllowedException();
}

export function loader() {
    throw new ServerMethodNotAllowedException();
}
