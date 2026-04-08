import type { Route } from "./+types/api.admin.$type";
import { fileStorageConfig } from "@/config";
import { FormData2Any } from "@/lib/utils";
import { parseFormData, type FileUpload } from "@remix-run/form-data-parser";
import { getStorageKey, fileStorage } from "@/storage";
import { sdk, applyAuth, forward } from "@/lib/server.utils";
import { ServerBadRequestException, ServerMethodNotAllowedException } from "@/lib/errors";

export async function action({ request, params }: Route.ActionArgs) {
    if (!["POST", "PUT", "DELETE"].includes(request.method)) throw new ServerMethodNotAllowedException();

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
        throw new ServerBadRequestException();

    const id = typeof object.id === "string" ? object.id : undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = object as any;

    switch (type) {
        case "Product": {
            const namespace = sdk.products;
            switch (request.method) {
                case "POST":
                    return forward(() => namespace.postProducts({ body, ...auth }));
                case "PUT":
                    if (!id) throw new ServerBadRequestException();
                    return forward(() => namespace.putProducts({ body, ...auth }));
                case "DELETE":
                    if (!id) throw new ServerBadRequestException();
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
                    if (!id) throw new ServerBadRequestException();
                    return forward(() => namespace.putCategories({ body, ...auth }));
                case "DELETE":
                    if (!id) throw new ServerBadRequestException();
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
                    if (!id) throw new ServerBadRequestException();
                    return forward(() => namespace.putImages({ body, ...auth }));
                case "DELETE":
                    if (!id) throw new ServerBadRequestException();
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
                    if (!id) throw new ServerBadRequestException();
                    return forward(() => namespace.putUsers({ body, ...auth }));
                case "DELETE":
                    if (!id) throw new ServerBadRequestException();
                    return forward(() => namespace.deleteUsersById({ path: { id }, ...auth }));
            }
            break;
        }
        case "Session": {
            const namespace = sdk.users;
            switch (request.method) {
                case "DELETE":
                    if (!id) throw new ServerBadRequestException();
                    return forward(() => namespace.deleteUsersSessionsById({ path: { id }, ...auth }));
                default:
                    throw new ServerMethodNotAllowedException();
            }
        }
        default:
            throw new ServerBadRequestException();
    }

    throw new ServerBadRequestException();
}

export function loader() {
    throw new ServerMethodNotAllowedException();
}
