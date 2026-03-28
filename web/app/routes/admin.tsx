import type { Route } from "./+types/admin";
import type { PageHandle } from "@/types";
import type { Product, Category, Image } from "@/lib/client/types.gen";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Any2FormData } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Img } from "@/components/img-wrapper";
import { ButtonGroup } from "@/components/ui/button-group";
import { toast } from "sonner";
import { fileStorageConfig, UPLOAD_URL } from "@/config";
import { StatusCodes } from "http-status-codes";
import { CsrfContext } from "@/context.server";
import { sdk, applyAuth } from "@/lib/server.utils";
import { TableGenerator, type Config, FieldConfigDefaults } from "@/components/tablegenerator";

export type TableTypes = "Product" | "Category" | "Image";

export const baseSchema = z.object({
    id: z.uuidv4().nullable().optional(),
});
export const productSchema = baseSchema.extend({
    name: z.string(),
    description: z.string().nullable(),
    price: z.coerce.number<number>().min(0.01),
    catid: z.uuidv4(),
    images: z.array(z.uuidv4()),
});

export const categorySchema = baseSchema.extend({
    name: z.string(),
    description: z.string().nullable(),
});

export const imageSchema = baseSchema.extend({
    url: z.union([
        z.url({
            protocol: /^https?$/,
            hostname: z.regexes.domain,
        }),
        z.string().regex(new RegExp(`^${UPLOAD_URL}`)),
        z.file().max(fileStorageConfig.maxFileSize!),
    ]),
    alt: z.string().nullable().optional(),
});

export async function loader({ request, context }: Route.LoaderArgs) {
    const auth = await applyAuth(request);
    const { data: products, error: perror } = await sdk.products.getProducts(auth);
    const { data: categories, error: cerror } = await sdk.categories.getCategories(auth);
    const { data: images, error: ierror } = await sdk.images.getImages(auth);
    const csrf = context.get(CsrfContext);
    if (perror || cerror || ierror || !csrf) {
        throw new Response("Failed to load data", { status: StatusCodes.INTERNAL_SERVER_ERROR });
    }
    return { products, categories, images, csrf };
}

export default function Admin({ loaderData }: Route.ComponentProps) {
    const onSubmit = async <T extends { id?: string }, K extends keyof T & string = keyof T & string>(
        ...[{ config, method, value }]: Parameters<Config<T, TableTypes, K>["onSubmit"]>
    ) => {
        const form = Any2FormData(value);
        form.append("TableType", config.TableType);
        const response = await fetch("/api/admin", {
            method,
            body: form,
        });
        if (!response.ok) {
            const error = await response.text();
            toast.error(
                `Failed to ${method === "post" ? "create" : method === "put" ? "update" : "delete"} ${config.TableType}: ${error}`,
            );
            throw new Error(error);
        }
        const responseData = response.status !== 204 ? await response.json() : null;
        toast.success(
            `${config.TableType} ${method === "post" ? "created" : method === "put" ? "updated" : "deleted"} successfully`,
        );
        return responseData as T;
    };

    const PConfig: Config<Product, TableTypes> = {
        $schema: productSchema,
        TableType: "Product",
        onSubmit: onSubmit<Product>,
        fields: FieldConfigDefaults<Product>([
            { key: "id", disabled: true },
            { key: "created_at", disabled: true },
            { key: "updated_at", disabled: true },
            { key: "name" },
            { key: "description" },
            { key: "price" },
            { key: "catid" },
            {
                key: "images",
                toSchemaType: (data) => (Array.isArray(data) ? data.map((d) => String(d.id)) : []),
                fromSchemaType: (value) =>
                    Array.isArray(value)
                        ? value.reduce((acc, id) => {
                              const img = loaderData.images?.find((i) => i.id === id);
                              if (img) acc.push(img);
                              return acc;
                          }, [] as Image[])
                        : [],
                nested: {
                    TableType: "Product Images",
                    $schema: baseSchema,
                    onSubmit: ({ value }) => {
                        const img = loaderData.images?.find((i) => i.id === value.id);
                        if (!img) throw new Error("Image not found");
                        return img;
                    },
                    fields: FieldConfigDefaults<Image>([
                        {
                            key: "url",
                            name: "preview",
                            disabled: true,
                            render: ({ create, value }) => {
                                return !create ? (
                                    <Img
                                        src={`${value}?thumbnail=true`}
                                        alt="Image preview"
                                        className="h-20 w-20 object-cover m-auto"
                                    />
                                ) : (
                                    <> </>
                                );
                            },
                        },
                        { key: "id" },
                    ]),
                },
            },
        ]),
    };
    const CConfig: Config<Category, TableTypes> = {
        $schema: categorySchema,
        TableType: "Category",
        onSubmit: onSubmit<Category>,
        fields: FieldConfigDefaults<Category>([
            { key: "id", disabled: true },
            { key: "created_at", disabled: true },
            { key: "updated_at", disabled: true },
            { key: "name" },
            { key: "description" },
        ]),
    };

    const IConfig: Config<Image, TableTypes> = {
        TableType: "Image",
        $schema: imageSchema,
        onSubmit: onSubmit<Image>,
        fields: FieldConfigDefaults<Image>([
            { key: "id", disabled: true },
            { key: "created_at", disabled: true },
            { key: "updated_at", disabled: true },
            {
                key: "url",
                name: "preview",
                disabled: true,
                render: ({ create, value }) => {
                    return !create ? (
                        <Img
                            src={`${value}?thumbnail=true`}
                            alt="Image preview"
                            className="h-20 w-20 object-cover m-auto"
                        />
                    ) : (
                        <> </>
                    );
                },
            },
            {
                key: "url",
                file: true,
                render: ({ create, onChange, ...props }) => {
                    return (
                        <ButtonGroup className="w-full">
                            <Input {...props} onChange={onChange} />
                            {create && (
                                <Button
                                    type="button"
                                    onClick={(e) => {
                                        const child = e.currentTarget?.children[0] as HTMLInputElement | null;
                                        child?.click();
                                    }}
                                >
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            onChange?.(e);
                                            e.currentTarget.value = "";
                                        }}
                                    />
                                    File
                                </Button>
                            )}
                        </ButtonGroup>
                    );
                },
            },
            { key: "alt" },
        ]),
    };

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
            <div className="flex flex-col">
                <div className="p-4 rounded shadow">
                    <h2 className="text-xl font-semibold mb-2 w-full text-center">Products</h2>
                    <TableGenerator data={loaderData.products ?? []} config={PConfig} />
                </div>
                <div className="p-4 rounded shadow">
                    <h2 className="text-xl font-semibold mb-2 w-full text-center">Categories</h2>
                    <TableGenerator data={loaderData.categories ?? []} config={CConfig} />
                </div>
                <div className="p-4 rounded shadow">
                    <h2 className="text-xl font-semibold mb-2 w-full text-center">Images</h2>
                    <TableGenerator data={loaderData.images ?? []} config={IConfig} />
                </div>
            </div>
        </div>
    );
}

export const handle: PageHandle<Route.ComponentProps["loaderData"]> = {
    breadcrumb: ({ pathname }) => ({
        pathname,
        name: "Admin",
    }),
};
