import type { Route } from "./+types/api.admin.$type";
import { fileStorageConfig } from "@/config";
import { FormData2Any } from "@/lib/utils";
import { parseFormData, type FileUpload } from "@remix-run/form-data-parser";
import { getStorageKey, fileStorage } from "@/storage";
import { StatusCodes } from "http-status-codes";
import { sdk, applyAuth, applySessionCookie } from "@/lib/server.utils";

export async function action({ request, params }: Route.ActionArgs) {
    if (!["POST", "PUT", "DELETE"].includes(request.method))
        throw new Response("Invalid method", { status: StatusCodes.METHOD_NOT_ALLOWED });

    const auth = await applyAuth(request);

    async function uploadHandler(fileUpload: FileUpload) {
        if (fileUpload.fieldName === "url" && fileUpload.type.startsWith("image/")) {
            const storageKey = getStorageKey();
            await fileStorage.set(storageKey, fileUpload);
            return storageKey;
        }
    }

    const form = await parseFormData(request, fileStorageConfig, uploadHandler);

    const type = params.type;
    const object = FormData2Any(form);

    // TODO: better error handling and validation
    if (
        !type ||
        typeof type !== "string" ||
        typeof object !== "object" ||
        object === null ||
        Array.isArray(object) ||
        object instanceof File
    )
        throw new Response("Invalid request", { status: StatusCodes.BAD_REQUEST });

    const id = typeof object.id === "string" ? object.id : undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = object as any;

    async function forward(
        call: () => Promise<{ data?: unknown; error?: unknown; response: Response }>
    ): Promise<Response> {
        const { data, error, response } = await call();
        const headers = await applySessionCookie(response.headers);
        if (!error)
            return data !== undefined
                ? Response.json(data, { status: response.status, headers })
                : new Response(null, { status: response.status, headers });
        throw new Response(JSON.stringify(error), {
            status: response.status,
            headers: { "Content-Type": "application/json" },
        });
    }

    switch (type) {
        case "Product": {
            const namespace = sdk.products;
            switch (request.method) {
                case "POST":
                    return forward(() => namespace.postProducts({ body, ...auth }));
                case "PUT":
                    if (!id) throw new Response("Bad Request", { status: StatusCodes.BAD_REQUEST });
                    return forward(() => namespace.putProducts({ body, ...auth }));
                case "DELETE":
                    if (!id) throw new Response("Bad Request", { status: StatusCodes.BAD_REQUEST });
                    return forward(() => namespace.deleteProductsById({ path: { id }, ...auth }));
            }
            break;
        }
        case "Category": {
            const namespace = sdk.categories;
            switch (request.method) {
                case "POST":
                    return forward(() => namespace.postCategories({ body, ...auth }));
                case "PUT":
                    if (!id) throw new Response("Bad Request", { status: StatusCodes.BAD_REQUEST });
                    return forward(() => namespace.putCategories({ body, ...auth }));
                case "DELETE":
                    if (!id) throw new Response("Bad Request", { status: StatusCodes.BAD_REQUEST });
                    return forward(() => namespace.deleteCategoriesById({ path: { id }, ...auth }));
            }
            break;
        }
        case "Image": {
            const namespace = sdk.images;
            switch (request.method) {
                case "POST":
                    return forward(() => namespace.postImages({ body, ...auth }));
                case "PUT":
                    if (!id) throw new Response("Bad Request", { status: StatusCodes.BAD_REQUEST });
                    return forward(() => namespace.putImages({ body, ...auth }));
                case "DELETE":
                    if (!id) throw new Response("Bad Request", { status: StatusCodes.BAD_REQUEST });
                    return forward(() => namespace.deleteImagesById({ path: { id }, ...auth }));
            }
            break;
        }
        case "User": {
            const namespace = sdk.users;
            switch (request.method) {
                case "POST":
                    return forward(() => namespace.postUsers({ body, ...auth }));
                case "PUT":
                    if (!id) throw new Response("Bad Request", { status: StatusCodes.BAD_REQUEST });
                    return forward(() => namespace.putUsers({ body, ...auth }));
                case "DELETE":
                    if (!id) throw new Response("Bad Request", { status: StatusCodes.BAD_REQUEST });
                    return forward(() => namespace.deleteUsersById({ path: { id }, ...auth }));
            }
            break;
        }
        case "Session": {
            const namespace = sdk.users;
            switch (request.method) {
                case "DELETE":
                    if (!id) throw new Response("Bad Request", { status: StatusCodes.BAD_REQUEST });
                    return forward(() => namespace.deleteUsersSessionsById({ path: { id }, ...auth }));
                default:
                    throw new Response("Bad Request", { status: StatusCodes.BAD_REQUEST });
            }
        }
        default:
            throw new Response("Bad Request", { status: StatusCodes.BAD_REQUEST });
    }

    throw new Response("Bad Request", { status: StatusCodes.BAD_REQUEST });
}
