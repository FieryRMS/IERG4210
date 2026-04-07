import type { Route } from "./+types/admin";
import type { PageHandle } from "@/types";
import type { Product, Category, Image, User, Session } from "@/lib/generated/types.gen";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Any2FormData, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Img } from "@/components/img-wrapper";
import { ButtonGroup } from "@/components/ui/button-group";
import { toast } from "sonner";
import { fileStorageConfig, UPLOAD_URL } from "@/config";
import { CsrfContext, UserContext } from "@/context.server";
import { sdk, applyAuth } from "@/lib/server.utils";
import { TableGenerator, type Config, FieldConfigDefaults } from "@/components/tablegenerator";
import { redirect } from "react-router";
import React, { useState } from "react";
import {
    zCategoryCreate,
    zCategoryUpdate,
    zDeleteCategoriesByIdData,
    zDeleteImagesByIdData,
    zDeleteProductsByIdData,
    zDeleteUsersByIdData,
    zDeleteUsersSessionsByIdData,
    zImageCreate,
    zImageUpdate,
    zProductCreate,
    zProductUpdate,
    zUserCreate,
    zUserUpdate,
} from "@/lib/generated/zod.gen";
import {
    Combobox,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxItemIndicator,
    ComboboxList,
    ComboboxPopup,
    ComboboxPositioner,
} from "@/components/ui/combobox";
import { XIcon } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import type { AnyFieldApi, AnyFormApi } from "@tanstack/react-form";

export type TableTypes = "Product" | "Category" | "Image" | "User" | "Session" | "Product Images";

function ForeignKeyCombobox<T extends { id?: string }>({
    items,
    getLabel,
    placeholder,
    disabled,
    field,
    className,
    form,
}: {
    items: T[];
    getLabel: (item: T) => string;
    placeholder?: string;
    disabled: boolean;
    field: AnyFieldApi;
    className?: string;
    form: AnyFormApi;
}) {
    const id = React.useId();
    return (
        <Combobox
            items={items}
            value={field.state.value ?? ""}
            onValueChange={(e) => field.handleChange(e)}
            readOnly={disabled}
        >
            <InputGroup className={cn("text-center border-primary/50", disabled && "opacity-80 border-primary/10")}>
                <ComboboxInput
                    placeholder={placeholder}
                    id={id}
                    className={cn(className, "pr-0! px-1")}
                    render={<InputGroupInput />}
                    readOnly={disabled}
                />
                <InputGroupAddon align="inline-end" className={cn(disabled && "opacity-80")}>
                    <button
                        onClick={() => form.resetField(field.name)}
                        className="enabled:hover:text-primary"
                        disabled={disabled}
                    >
                        <XIcon className={cn("size-4", !field.state.value && "invisible")} />
                    </button>
                </InputGroupAddon>
            </InputGroup>
            <ComboboxPositioner sideOffset={6}>
                <ComboboxPopup>
                    <ComboboxEmpty>{field.name} not found.</ComboboxEmpty>
                    <ComboboxList>
                        {(item: T) => (
                            <ComboboxItem key={item.id} value={item.id ?? ""} className="w-full">
                                <ComboboxItemIndicator />
                                <div className="col-start-2 text-nowrap text-center w-full">{getLabel(item)}</div>
                            </ComboboxItem>
                        )}
                    </ComboboxList>
                </ComboboxPopup>
            </ComboboxPositioner>
        </Combobox>
    );
}

const url = z.union([
    z.url({
        protocol: /^https?$/,
        hostname: z.regexes.domain,
    }),
    z.string().regex(new RegExp(`^${UPLOAD_URL}`)),
    z.file().max(fileStorageConfig.maxFileSize!),
]);

export async function loader({ request, context }: Route.LoaderArgs) {
    const user = context.get(UserContext);
    if (!user || user.role !== "admin") throw redirect("/");
    const auth = await applyAuth(request);
    const { data: products, error: perror } = await sdk.products.getProducts(auth);
    const { data: categories, error: cerror } = await sdk.categories.getCategories(auth);
    const { data: images, error: ierror } = await sdk.images.getImages(auth);
    const { data: users, error: uerror } = await sdk.users.getUsers(auth);
    const csrf = context.get(CsrfContext);

    return {
        products: { data: products, error: perror },
        categories: { data: categories, error: cerror },
        images: { data: images, error: ierror },
        users: { data: users, error: uerror },
        csrf,
    };
}

export default function Admin({ loaderData }: Route.ComponentProps) {
    const [products, setProducts] = useState(loaderData.products.data ?? []);
    const [categories, setCategories] = useState(loaderData.categories.data ?? []);
    const [images, setImages] = useState(loaderData.images.data ?? []);
    const [users, setUsers] = useState(loaderData.users.data ?? []);
    const imageMap = React.useMemo(() => {
        const map = new Map<unknown, Image>();
        images.forEach((img) => {
            if (img.id) map.set(img.id, img);
        });
        return map;
    }, [images]);

    const onSubmit = async <
        T extends { id?: string },
        TableTypes extends string = string,
        K extends keyof T & string = keyof T & string,
    >(
        ...[{ config, method, value }]: Parameters<Config<T, TableTypes, K>["onSubmit"]>
    ) => {
        const form = Any2FormData(value);
        const response = await fetch(`/api/admin/${config.TableType}`, {
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
        return responseData;
    };

    const PConfig: Config<Product, TableTypes> = {
        TableType: "Product",
        desc: "Product CRUD",
        methods: {
            post: zProductCreate.extend({ price: z.coerce.number().positive() }),
            put: zProductUpdate.extend({ price: z.coerce.number().positive().optional() }),
            delete: zDeleteProductsByIdData.shape.path,
        },
        onSubmit: onSubmit<Product, TableTypes>,
        fields: FieldConfigDefaults<Product, TableTypes>([
            { key: "id", disabled: () => true },
            { key: "created_at", disabled: () => true },
            { key: "updated_at", disabled: () => true },
            { key: "name" },
            { key: "description" },
            { key: "price" },
            {
                key: "catid",

                Render: ({ disabled, field, className, form }) => (
                    <ForeignKeyCombobox
                        items={categories}
                        getLabel={(item) => item.name ?? item.id!}
                        placeholder="Category ID"
                        disabled={disabled}
                        field={field}
                        className={className}
                        form={form}
                    />
                ),
            },
            {
                key: "images",
                toSchemaType: (data) => (Array.isArray(data) ? data.map((d) => String(d.id)) : []),
                fromSchemaType: (value) =>
                    Array.isArray(value)
                        ? value.reduce((acc, id) => {
                              const img = imageMap.get(id);
                              if (img) acc.push(img);
                              return acc;
                          }, [] as Image[])
                        : [],
                nested: {
                    TableType: "Product Images",
                    methods: {
                        post: zDeleteImagesByIdData.shape.path,
                        put: zDeleteImagesByIdData.shape.path,
                        delete: zDeleteImagesByIdData.shape.path,
                    },
                    desc: "Manage images associated with the product - Click submit on product to save",
                    onSubmit: ({ value }) => {
                        const img = imageMap.get(value.id);
                        if (!img) throw new Error("Image not found");
                        return img;
                    },
                    fields: FieldConfigDefaults<Image>([
                        {
                            key: "id",
                            name: "preview",
                            disabled: () => true,
                            Render: ({ create, field }) => {
                                const image = imageMap.get(field.state.value);
                                if (!image) return <> </>;
                                return !create ? (
                                    <Img
                                        src={`${image.url}?thumbnail=true`}
                                        alt="Image preview"
                                        className="h-20 w-20 object-cover m-auto rounded-md"
                                    />
                                ) : (
                                    <> </>
                                );
                            },
                        },
                        {
                            key: "id",
                            Render: ({ disabled, field, className, form }) => (
                                <ForeignKeyCombobox
                                    items={images}
                                    getLabel={(item) => item.alt ?? item.id!}
                                    placeholder="Image ID"
                                    disabled={disabled}
                                    field={field}
                                    className={className}
                                    form={form}
                                />
                            ),
                        },
                    ]),
                },
            },
        ]),
    };
    const CConfig: Config<Category, TableTypes> = {
        TableType: "Category",
        desc: "Category CRUD",
        methods: {
            post: zCategoryCreate,
            put: zCategoryUpdate,
            delete: zDeleteCategoriesByIdData.shape.path,
        },
        onSubmit: onSubmit<Category, TableTypes>,
        fields: FieldConfigDefaults<Category>([
            { key: "id", disabled: () => true },
            { key: "created_at", disabled: () => true },
            { key: "updated_at", disabled: () => true },
            { key: "name" },
            { key: "description" },
        ]),
    };

    const IConfig: Config<Image, TableTypes> = {
        TableType: "Image",
        methods: {
            post: zImageCreate.extend({ url }),
            put: zImageUpdate.extend({ url: url.optional() }),
            delete: zDeleteImagesByIdData.shape.path,
        },
        desc: "Image CRUD",
        onSubmit: onSubmit<Image, TableTypes>,
        fields: FieldConfigDefaults<Image>([
            { key: "id", disabled: () => true },
            { key: "created_at", disabled: () => true },
            { key: "updated_at", disabled: () => true },
            {
                key: "url",
                name: "preview",
                disabled: () => true,
                Render: ({ create, field }) => {
                    return !create ? (
                        <Img
                            src={`${field.state.value}?thumbnail=true`}
                            alt="Image preview"
                            className="h-20 w-20 object-cover m-auto rounded-md"
                        />
                    ) : (
                        <> </>
                    );
                },
            },
            {
                key: "url",
                file: true,
                Render: ({ disabled, field, className }) => {
                    return (
                        <ButtonGroup className="w-full">
                            <Input
                                onChange={(e) => field.handleChange(e.target.value)}
                                readOnly={disabled}
                                className={className}
                                value={field.state.value instanceof File ? field.state.value.name : field.state.value}
                            />
                            <Button
                                type="button"
                                onClick={(e) => {
                                    const child = e.currentTarget?.children[0] as HTMLInputElement | null;
                                    child?.click();
                                }}
                                disabled={disabled}
                            >
                                <Input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                        if (e.target.files) {
                                            const file = e.target.files[0];
                                            if (file) {
                                                // TODO: Active bug in Tanstack: https://github.com/TanStack/form/issues/1932#issuecomment-3656323010
                                                Object.defineProperties(file, {
                                                    name: { value: file.name, enumerable: true },
                                                    size: { value: file.size, enumerable: true },
                                                    type: { value: file.type, enumerable: true },
                                                });
                                                field.handleChange(file);
                                            }
                                        }
                                    }}
                                />
                                File
                            </Button>
                        </ButtonGroup>
                    );
                },
            },
            { key: "alt" },
        ]),
    };

    const UConfig: Config<User, TableTypes> = {
        TableType: "User",
        methods: {
            post: zUserCreate,
            put: zUserUpdate,
            delete: zDeleteUsersByIdData.shape.path,
        },
        desc: "User CRUD",
        onSubmit: onSubmit<User, TableTypes>,
        fields: FieldConfigDefaults<User, TableTypes>([
            { key: "id", disabled: () => true },
            { key: "created_at", disabled: () => true },
            { key: "updated_at", disabled: () => true },
            { key: "email" },
            { key: "username" },
            { key: "role" },
            {
                key: "password",
            },
            {
                key: "sessions",
                exclude: true,
                disabled: ({ isEditing, isSubmitting, create }) => isSubmitting || isEditing || create,
                nested: {
                    TableType: "Session",
                    saveOnSubmit: true,
                    desc: "Manage user sessions - deletes sesion directly",
                    methods: {
                        delete: zDeleteUsersSessionsByIdData.shape.path,
                    },
                    onSubmit: onSubmit<Session, TableTypes>,
                    fields: FieldConfigDefaults<Session, TableTypes>([
                        { key: "id", disabled: () => true },
                        { key: "created_at", disabled: () => true },
                        { key: "user_id", disabled: () => true },
                        { key: "max_age", disabled: () => true },
                    ]),
                },
            },
        ]),
    };
    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4 w-full text-center">Admin Dashboard</h1>
            <div className="flex flex-col">
                <div className="p-4 rounded shadow">
                    <h2 className="text-xl font-semibold mb-2 w-full text-center">Products</h2>
                    {loaderData.products.error ? (
                        <p className="text-xl font-semibold mb-2 w-full text-center text-red-500">
                            Failed to load products: {(loaderData.products.error as { detail: string }).detail}
                        </p>
                    ) : (
                        <TableGenerator data={products ?? []} config={PConfig} onSubmit={setProducts} />
                    )}
                </div>
                <div className="p-4 rounded shadow">
                    <h2 className="text-xl font-semibold mb-2 w-full text-center">Categories</h2>
                    {loaderData.categories.error ? (
                        <p className="text-xl font-semibold mb-2 w-full text-center text-red-500">
                            Failed to load categories: {(loaderData.categories.error as { detail: string }).detail}
                        </p>
                    ) : (
                        <TableGenerator data={categories ?? []} config={CConfig} onSubmit={setCategories} />
                    )}
                </div>
                <div className="p-4 rounded shadow">
                    <h2 className="text-xl font-semibold mb-2 w-full text-center">Images</h2>
                    {loaderData.images.error ? (
                        <p className="text-xl font-semibold mb-2 w-full text-center text-red-500">
                            Failed to load images: {(loaderData.images.error as { detail: string }).detail}
                        </p>
                    ) : (
                        <TableGenerator data={images ?? []} config={IConfig} onSubmit={setImages} />
                    )}
                </div>
                <div className="p-4 rounded shadow">
                    <h2 className="text-xl font-semibold mb-2 w-full text-center">Users</h2>
                    {loaderData.users.error ? (
                        <p className="text-xl font-semibold mb-2 w-full text-center text-red-500">
                            Failed to load users: {(loaderData.users.error as { detail: string }).detail}
                        </p>
                    ) : (
                        <TableGenerator data={users ?? []} config={UConfig} onSubmit={setUsers} />
                    )}
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
