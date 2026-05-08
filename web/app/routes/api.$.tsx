import { getAuth, forward } from "@/lib/server.utils";
import { server, FormData2Any } from "@/lib/utils";
import type { Route } from "./+types/api.$";
import type { HttpMethod } from "@/lib/generated/core/types.gen";
import { getConfig, type UploadConfig } from "@/config";
import { parseFormData, type FileUpload } from "@remix-run/form-data-parser";
import { getStorageKey, fileStorage } from "@/storage";
import { ServerBadRequestException, ServerForbiddenException, ServerUnauthorizedException } from "@/lib/errors";
import { UserContext } from "@/lib/security.server";
import { getClientIPAddress } from "@/lib/get-client-ip-address";

async function formParser(request: Request, config?: UploadConfig) {
    async function uploadHandler(fileUpload: FileUpload) {
        if (config && config.type.test(fileUpload.type) && config.fields.includes(fileUpload.fieldName)) {
            const storageKey = getStorageKey();
            await fileStorage.set(storageKey, fileUpload);
            return storageKey;
        }
    }

    const form = await parseFormData(
        request,
        {
            maxFiles: config?.maxFiles,
            maxFileSize: config?.maxFileSize,
        },
        uploadHandler,
    );
    const object = FormData2Any(form);

    if (object instanceof File || object === null || Array.isArray(object) || typeof object !== "object")
        throw new ServerBadRequestException();
    return object;
}

export async function loader({ request, context }: Route.LoaderArgs) {
    const url = new URL(request.url);
    url.pathname = url.pathname.replace(/^\/api(?=\/|$)/, "");
    if (/^\/(docs|redoc|openapi\.json)(\/|$)/.test(url.pathname)) {
        throw new ServerForbiddenException().toResponse();
    }
    const path = url.toString().replace(url.origin, "");

    const auth = await getAuth(request);
    const user = context.get(UserContext);
    const config = getConfig(path, request.method);
    if (config && config.roles && config.roles.length > 0) {
        if (!user) throw new ServerUnauthorizedException().toResponse();
        if (!user.role || !config.roles.includes(user.role)) throw new ServerForbiddenException().toResponse();
    }

    const contentType = request.headers.get("Content-Type");
    const isForm = contentType?.startsWith("multipart/form-data");
    const body = !contentType ? undefined : isForm ? await formParser(request, config) : await request.json();

    const ipAddress = getClientIPAddress(request);
    const clientUserAgent = request.headers.get("user-agent");

    return forward(() =>
        server.request({
            method: request.method as Uppercase<HttpMethod>,
            url: path,
            security: [
                { name: "X-Session-Token", type: "apiKey" },
                { name: "X-Application-Token", type: "apiKey" },
            ],
            ...auth,
            body,
            headers: {
                ...(ipAddress && { "X-Forwarded-For": ipAddress }),
                ...{ "X-Forwarded-Proto": url.protocol.replace(":", "") },
                ...(clientUserAgent && { "X-Forwarded-User-Agent": clientUserAgent }),
            },
        }),
    );
}

export const action = loader;
