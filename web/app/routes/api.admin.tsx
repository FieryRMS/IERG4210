import type { Route } from "./+types/api.admin";
import { z } from "zod";
import { fileStorageConfig } from "@/config";
import { getClient } from "@/lib/utils";
import { parseFormData, type FileUpload } from "@remix-run/form-data-parser";
import { getStorageKey, fileStorage } from "@/storage";
import { productSchema, categorySchema, imageSchema } from "@/schema";

export async function action({ request }: Route.ActionArgs) {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    async function uploadHandler(fileUpload: FileUpload) {
        if (fileUpload.fieldName === "url" && fileUpload.type.startsWith("image/")) {
            const storageKey = getStorageKey();
            await fileStorage.set(storageKey, fileUpload);
            return storageKey;
        }
    }

    const form = await parseFormData(request, fileStorageConfig, uploadHandler);
    const client = getClient();

    const type = form.get("tabletype");
    const object = Array.from(form.entries()).reduce(
        (acc, [key, value]) => {
            if (typeof value !== "string") {
                return acc;
            }
            if (acc[key]) {
                if (!Array.isArray(acc[key])) {
                    acc[key] = [acc[key]];
                }
                acc[key].push(value);
            } else if (typeof value === "string") {
                acc[key] = value;
            }
            return acc;
        },
        {} as Record<string, string | string[]>,
    );

    switch (type) {
        case "Product": {
            const { data, success, error } = productSchema.safeParse(object);
            if (!success) {
                throw new Response(JSON.stringify(error), { status: 400 });
            }
            switch (request.method) {
                case "POST":
                    return (await client.POST("/products/", { body: data })).data;
                case "PUT":
                    return (
                        await client.PUT(`/products/{product_id}`, {
                            params: { path: { product_id: data.id! } },
                            body: data,
                        })
                    ).data;
                case "DELETE":
                    return (
                        await client.DELETE(`/products/{product_id}`, { params: { path: { product_id: data.id! } } })
                    ).data;
            }
            break;
        }
        case "Category": {
            const { data, success, error } = categorySchema.safeParse(object);
            if (!success) {
                throw new Response(JSON.stringify(error), { status: 400 });
            }
            switch (request.method) {
                case "POST":
                    return (await client.POST("/categories/", { body: data })).data;
                case "PUT":
                    return (
                        await client.PUT(`/categories/{category_id}`, {
                            params: { path: { category_id: data.id! } },
                            body: data,
                        })
                    ).data;
                case "DELETE":
                    return (
                        await client.DELETE(`/categories/{category_id}`, {
                            params: { path: { category_id: data.id! } },
                        })
                    ).data;
            }
            break;
        }
        case "Image": {
            const { data, success, error } = imageSchema.safeParse(object);
            if (!success || typeof data.url !== "string") {
                throw new Response(JSON.stringify(error), { status: 400 });
            }
            switch (request.method) {
                case "POST":
                    return (
                        await client.POST("/images/", { body: data as z.infer<typeof imageSchema> & { url: string } })
                    ).data;
                case "PUT":
                    return (
                        await client.PUT(`/images/{image_id}`, {
                            params: { path: { image_id: data.id! } },
                            body: data as z.infer<typeof imageSchema> & { url: string },
                        })
                    ).data;
                case "DELETE":
                    return (await client.DELETE(`/images/{image_id}`, { params: { path: { image_id: data.id! } } }))
                        .data;
            }
            break;
        }
    }
    throw new Response("Invalid request", { status: 400 });
}
