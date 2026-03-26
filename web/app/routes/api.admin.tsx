import type { Route } from "./+types/api.admin";
import { fileStorageConfig } from "@/config";
import { FormData2Any, getClient } from "@/lib/utils";
import { parseFormData, type FileUpload } from "@remix-run/form-data-parser";
import { getStorageKey, fileStorage } from "@/storage";
import { type TableTypes } from "@/routes/admin";
import { StatusCodes } from "http-status-codes";

export async function action({ request }: Route.ActionArgs) {
    if (!["POST", "PUT", "DELETE"].includes(request.method))
        throw new Response("Invalid method", { status: StatusCodes.METHOD_NOT_ALLOWED });

    if (process.env.API_MODE === "dev") await new Promise((resolve) => setTimeout(resolve, 1000));

    async function uploadHandler(fileUpload: FileUpload) {
        if (fileUpload.fieldName === "url" && fileUpload.type.startsWith("image/")) {
            const storageKey = getStorageKey();
            await fileStorage.set(storageKey, fileUpload);
            return storageKey;
        }
    }

    const form = await parseFormData(request, fileStorageConfig, uploadHandler);
    const client = getClient();

    const type = form.get("TableType") as TableTypes | null;
    const object = FormData2Any(form) as { id?: string };

    // TODO: better error handling and validation
    if (!type || typeof type !== "string") throw new Response("Invalid type", { status: StatusCodes.BAD_REQUEST });

    const endpointMap: Partial<Record<TableTypes, string>> = {
        Product: "/products/",
        Category: "/categories/",
        Image: "/images/",
    };
    let endpoint = endpointMap[type];
    if (!endpoint) throw new Response("Invalid type", { status: StatusCodes.BAD_REQUEST });
    if (["PUT", "DELETE"].includes(request.method)) endpoint += `{id}`;

    // @ts-expect-error: request.method is validated to POST/PUT/DELETE above, endpoints are also retrived from endpointMap, so this is safe
    const { data, error, response } = await client.request(request.method, endpoint, {
        body: object,
        params: { path: { id: object.id } },
    });
    // if error or success just duplicate response and pass on
    if (response.status === StatusCodes.NO_CONTENT) return new Response(null, { status: StatusCodes.NO_CONTENT });
    return Response.json(data ?? error ?? null, { status: response.status });
}
