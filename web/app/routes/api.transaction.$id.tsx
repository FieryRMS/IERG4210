import type { Route } from "./+types/api.transaction.$id";
import { sdk, applyAuth, forward } from "@/lib/server.utils";
import { ServerMethodNotAllowedException } from "@/lib/errors";

export async function action({ request, params }: Route.ActionArgs) {
    const auth = await applyAuth(request);
    const { id } = params;

    if (request.method === "PUT" && id) {
        return forward(() => sdk.transactions.putTransactionsCancelById({ ...auth, path: { id } }));
    }
    throw new ServerMethodNotAllowedException();
}

export function loader() {
    throw new ServerMethodNotAllowedException();
}
