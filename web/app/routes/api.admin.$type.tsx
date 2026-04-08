import type { Route } from "./+types/api.admin.$type";
import { fileStorageConfig } from "@/config";
import { FormData2Any } from "@/lib/utils";
import { parseFormData, type FileUpload } from "@remix-run/form-data-parser";
import { getStorageKey, fileStorage } from "@/storage";
import { sdk, applyAuth, forward } from "@/lib/server.utils";
import { ServerBadRequestException, ServerMethodNotAllowedException } from "@/lib/errors";
import type {
    CategoryCreate,
    CategoryUpdate,
    DeleteCategoriesByIdData,
    DeleteImagesByIdData,
    DeleteProductsByIdData,
    DeleteUsersByIdData,
    DeleteUsersSessionsByIdData,
    ImageCreate,
    ImageUpdate,
    ProductCreate,
    ProductUpdate,
    UserCreate,
    UserUpdate,
} from "@/lib/generated/types.gen";

async function formParser(request: Request, fileFields: string[] = []) {
    async function uploadHandler(fileUpload: FileUpload) {
        if (fileFields.includes(fileUpload.fieldName) && fileUpload.type.startsWith("image/")) {
            const storageKey = getStorageKey();
            await fileStorage.set(storageKey, fileUpload);
            return storageKey;
        }
    }

    const form = await parseFormData(request, fileStorageConfig, uploadHandler);
    const object = FormData2Any(form);

    if (object instanceof File || object === null || Array.isArray(object) || typeof object !== "object")
        throw new ServerBadRequestException();
    return object;
}

export async function action({ request, params }: Route.ActionArgs) {
    if (!["POST", "PUT", "DELETE"].includes(request.method)) throw new ServerMethodNotAllowedException();

    const auth = await applyAuth(request);

    const type = params.type;

    if (!type || typeof type !== "string") throw new ServerBadRequestException();

    switch (type) {
        case "Product": {
            const namespace = sdk.products;
            const obj = await formParser(request);
            switch (request.method) {
                case "POST": {
                    const body = obj as ProductCreate;
                    return forward(() => namespace.postProducts({ body, ...auth }));
                }
                case "PUT": {
                    const body = obj as ProductUpdate;
                    return forward(() => namespace.putProducts({ body, ...auth }));
                }
                case "DELETE": {
                    const body = obj as DeleteProductsByIdData["path"];
                    return forward(() => namespace.deleteProductsById({ path: { id: body?.id }, ...auth }));
                }
            }
            break;
        }
        case "Category": {
            const namespace = sdk.categories;
            const obj = await formParser(request);
            switch (request.method) {
                case "POST": {
                    const body = obj as CategoryCreate;
                    return forward(() => namespace.postCategories({ body, ...auth }));
                }
                case "PUT": {
                    const body = obj as CategoryUpdate;
                    return forward(() => namespace.putCategories({ body, ...auth }));
                }
                case "DELETE": {
                    const body = obj as DeleteCategoriesByIdData["path"];
                    return forward(() => namespace.deleteCategoriesById({ path: { id: body?.id }, ...auth }));
                }
            }
            break;
        }
        case "Image": {
            const namespace = sdk.images;
            switch (request.method) {
                case "POST": {
                    const obj = await formParser(request, ["root.url"]);
                    const body = obj as ImageCreate;
                    return forward(() => namespace.postImages({ body, ...auth }));
                }
                case "PUT": {
                    const obj = await formParser(request, ["root.url"]);
                    const body = obj as ImageUpdate;
                    return forward(() => namespace.putImages({ body, ...auth }));
                }
                case "DELETE": {
                    const obj = await formParser(request);
                    const body = obj as DeleteImagesByIdData["path"];
                    return forward(() => namespace.deleteImagesById({ path: { id: body?.id }, ...auth }));
                }
            }
            break;
        }
        case "User": {
            const namespace = sdk.users;
            const obj = await formParser(request);
            switch (request.method) {
                case "POST": {
                    const body = obj as UserCreate;
                    return forward(() => namespace.postUsers({ body, ...auth }));
                }
                case "PUT": {
                    const body = obj as UserUpdate;
                    return forward(() => namespace.putUsers({ body, ...auth }));
                }
                case "DELETE": {
                    const body = obj as DeleteUsersByIdData["path"];
                    return forward(() => namespace.deleteUsersById({ path: { id: body?.id }, ...auth }));
                }
            }
            break;
        }
        case "Session": {
            const namespace = sdk.users;
            const obj = await formParser(request);
            switch (request.method) {
                case "DELETE": {
                    const body = obj as DeleteUsersSessionsByIdData["path"];
                    return forward(() => namespace.deleteUsersSessionsById({ path: { id: body?.id }, ...auth }));
                }
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
