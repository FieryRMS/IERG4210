import type { Route } from "./+types/api.admin";
import { fileStorageConfig } from "@/config";
import { FormData2Any } from "@/lib/utils";
import { parseFormData, type FileUpload } from "@remix-run/form-data-parser";
import { getStorageKey, fileStorage } from "@/storage";
import { type TableTypes } from "@/routes/admin";
import { StatusCodes } from "http-status-codes";
import { sdk, applyAuth, applySessionCookie } from "@/lib/server.utils";

export async function action({ request }: Route.ActionArgs) {
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

    const type = form.get("TableType") as TableTypes | null;
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
    let err;

    switch (type) {
        case "Product": {
            const namespace = sdk.products;
            switch (request.method) {
                case "POST": {
                    const { data, error, response } = await namespace.postProducts({ body, ...auth });
                    if (data) return Response.json(data, { status: response.status, headers: await applySessionCookie(response.headers) });
                    err = error;
                    break;
                }
                case "PUT": {
                    if (!id) throw new Response("Bad Request", { status: StatusCodes.BAD_REQUEST });
                    const { data, error, response } = await namespace.putProductsByProductId({ body, path: { product_id: id }, ...auth });
                    if (data) return Response.json(data, { status: response.status, headers: await applySessionCookie(response.headers) });
                    err = error;
                    break;
                }
                case "DELETE": {
                    if (!id) throw new Response("Bad Request", { status: StatusCodes.BAD_REQUEST });
                    const { error, response } = await namespace.deleteProductsByProductId({ path: { product_id: id }, ...auth });
                    if (!error) return new Response(null, { status: response.status, headers: await applySessionCookie(response.headers) });
                    err = error;
                    break;
                }
            }
            break;
        }
        case "Category": {
            const namespace = sdk.categories;
            switch (request.method) {
                case "POST": {
                    const { data, error, response } = await namespace.postCategories({ body, ...auth });
                    if (data) return Response.json(data, { status: response.status, headers: await applySessionCookie(response.headers) });
                    err = error;
                    break;
                }
                case "PUT": {
                    if (!id) throw new Response("Bad Request", { status: StatusCodes.BAD_REQUEST });
                    const { data, error, response } = await namespace.putCategoriesByCategoryId({ body, path: { category_id: id }, ...auth });
                    if (data) return Response.json(data, { status: response.status, headers: await applySessionCookie(response.headers) });
                    err = error;
                    break;
                }
                case "DELETE": {
                    if (!id) throw new Response("Bad Request", { status: StatusCodes.BAD_REQUEST });
                    const { error, response } = await namespace.deleteCategoriesByCategoryId({ path: { category_id: id }, ...auth });
                    if (!error) return new Response(null, { status: response.status, headers: await applySessionCookie(response.headers) });
                    err = error;
                    break;
                }
            }
            break;
        }
        case "Image": {
            const namespace = sdk.images;
            switch (request.method) {
                case "POST": {
                    const { data, error, response } = await namespace.postImages({ body, ...auth });
                    if (data) return Response.json(data, { status: response.status, headers: await applySessionCookie(response.headers) });
                    err = error;
                    break;
                }
                case "PUT": {
                    if (!id) throw new Response("Bad Request", { status: StatusCodes.BAD_REQUEST });
                    const { data, error, response } = await namespace.putImagesByImageId({ body, path: { image_id: id }, ...auth });
                    if (data) return Response.json(data, { status: response.status, headers: await applySessionCookie(response.headers) });
                    err = error;
                    break;
                }
                case "DELETE": {
                    if (!id) throw new Response("Bad Request", { status: StatusCodes.BAD_REQUEST });
                    const { error, response } = await namespace.deleteImagesByImageId({ path: { image_id: id }, ...auth });
                    if (!error) return new Response(null, { status: response.status, headers: await applySessionCookie(response.headers) });
                    err = error;
                    break;
                }
            }
            break;
        }
        case "User": {
            const namespace = sdk.users;
            switch (request.method) {
                case "POST": {
                    const { data, error, response } = await namespace.postUsers({ body, ...auth });
                    if (data) return Response.json(data, { status: response.status, headers: await applySessionCookie(response.headers) });
                    err = error;
                    break;
                }
                case "PUT": {
                    if (!id) throw new Response("Bad Request", { status: StatusCodes.BAD_REQUEST });
                    const { data, error, response } = await namespace.putUsersByUserId({ body, path: { user_id: id }, ...auth });
                    if (data) return Response.json(data, { status: response.status, headers: await applySessionCookie(response.headers) });
                    err = error;
                    break;
                }
                case "DELETE": {
                    if (!id) throw new Response("Bad Request", { status: StatusCodes.BAD_REQUEST });
                    const { error, response } = await namespace.deleteUsersByUserId({ path: { user_id: id }, ...auth });
                    if (!error) return new Response(null, { status: response.status, headers: await applySessionCookie(response.headers) });
                    err = error;
                    break;
                }
            }
            break;
        }
        case "Session": {
            const namespace = sdk.users;
            switch (request.method) {
                case "DELETE": {
                    if (!id) throw new Response("Bad Request", { status: StatusCodes.BAD_REQUEST });
                    const { error, response } = await namespace.deleteUsersSessionsBySessionId({ path: { session_id: id }, ...auth });
                    if (!error) return new Response(null, { status: response.status, headers: await applySessionCookie(response.headers) });
                    err = error;
                    break;
                }
                default:
                    throw new Response("Bad Request", { status: StatusCodes.BAD_REQUEST });
            }
            break;
        }
        default:
            throw new Response("Bad Request", { status: StatusCodes.BAD_REQUEST });
    }

    throw new Response(JSON.stringify(err), { status: StatusCodes.INTERNAL_SERVER_ERROR, headers: { "Content-Type": "application/json" } });
}
