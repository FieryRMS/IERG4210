import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Route } from "./+types/admin";
import { Check, Pencil, Plus, Trash, X } from "lucide-react";
import type { Product, Category, PageHandle, Image } from "@/types";
import { z } from "zod";
import { useAppForm } from "@/components/ui/form-tanstack";
import { Input } from "@/components/ui/input";
import { cn, getClient, onChangeAsync } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useMemo, useRef } from "react";
import { useFetcher, type HTMLFormMethod } from "react-router";
import { Spinner } from "@/components/ui/spinner";
import { useStore } from "@tanstack/react-form";
import { type FileUpload, parseFormData } from "@remix-run/form-data-parser";
import { getStorageKey, fileStorage, fileStorageConfig } from "@/storage";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Item, ItemActions, ItemContent, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Img } from "@/components/img-wrapper";

const baseSchema = z.object({
    id: z.uuidv4().nullable().optional(),
    created_at: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{6}$/, "Invalid date format")
        .nullable()
        .optional(),
    updated_at: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{6}$/, "Invalid date format")
        .nullable()
        .optional(),
});
const productSchema = baseSchema.extend({
    name: z.string(),
    description: z.string().nullable(),
    price: z.coerce.number<number>().min(0.01),
    catid: z.uuidv4(),
    images: z.array(z.uuidv4()),
    type: z.literal("Product"),
});

const categorySchema = baseSchema.extend({
    name: z.string(),
    description: z.string().nullable(),
    type: z.literal("Category"),
});

const imageSchema = baseSchema.extend({
    url: z.union([z.file().max(10 * 1024 * 1024), z.string()]),
    alt: z.string().nullable(),
    type: z.literal("Image"),
});

type TableTypes = "Product" | "Category" | "Image";

export async function action({ request }: { request: Request }) {
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

    form.forEach((value, key) => {
        console.log(`${key}:`, value);
    });

    const rawdata = form.get("data");

    if (rawdata == null || typeof rawdata !== "string") {
        throw new Response("Invalid data", { status: 400 });
    }

    const data: z.infer<typeof productSchema | typeof categorySchema | typeof imageSchema> & {
        type: TableTypes;
        url?: string;
    } = await JSON.parse(rawdata);
    data.url = (form.get("url") as string | undefined) || data.url;
    switch (data.type) {
        case "Product":
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
        case "Category":
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
        case "Image":
            switch (request.method) {
                case "POST":
                    return (await client.POST("/images/", { body: data })).data;
                case "PUT":
                    return (
                        await client.PUT(`/images/{image_id}`, {
                            params: { path: { image_id: data.id! } },
                            body: data,
                        })
                    ).data;
                case "DELETE":
                    return (await client.DELETE(`/images/{image_id}`, { params: { path: { image_id: data.id! } } }))
                        .data;
            }
            break;
    }
    throw new Response("Invalid request", { status: 400 });
}

function ConfirmAnim({
    onStart,
    onConfirm,
    onCancel,
    className,
    ...props
}: {
    onStart?: () => void;
    onConfirm?: () => void;
    onCancel?: () => void;
} & React.HTMLAttributes<HTMLSpanElement>) {
    return (
        <>
            <span
                className={cn(
                    "absolute left-0 top-0 h-full w-0 bg-red-500 group-active:transition-all duration-500 group-active:w-full",
                    className,
                )}
                aria-hidden="true"
                onTransitionStart={() => {
                    onStart?.();
                }}
                onTransitionEnd={(e) => {
                    if (getComputedStyle(e.target as Element, e.pseudoElement).width !== "0px") onConfirm?.();
                }}
                onTransitionCancel={() => {
                    onCancel?.();
                }}
                {...props}
            />
        </>
    );
}
type SchemaType = string | number | null | (string | number | null)[];
interface FieldConfig<T> {
    disabled: boolean;
    render: (value: SchemaType) => React.ReactNode | string;
    toSchemaType: (data: T) => SchemaType;
    fromSchemaType: (value: SchemaType) => T;
    file: boolean;
}
function ConfigGenerator<T extends z.infer<typeof baseSchema>>(
    fields: (Partial<FieldConfig<T[keyof T]>> & { name: keyof T })[],
): {
    [K in keyof T]: FieldConfig<T[K]>;
} {
    return fields.reduce(
        (acc, { name, disabled, render, toSchemaType, fromSchemaType, file }) => {
            acc[name] = {
                disabled: disabled ?? false,
                render: render ?? ((value) => (value !== null && value !== undefined ? String(value) : "null")),
                toSchemaType:
                    toSchemaType ??
                    ((data) => {
                        if (Array.isArray(data))
                            return data.map((item) => {
                                if (typeof item === "object") return JSON.stringify(item);
                                if (item === null || item === undefined) return null;
                                if (typeof item === "number") return item;
                                return String(item);
                            });
                        if (typeof data === "object") return JSON.stringify(data);
                        if (data === null || data === undefined) return null;
                        if (typeof data === "number") return data;
                        return String(data);
                    }),
                fromSchemaType: fromSchemaType ?? ((value) => value as T[keyof T]),
                file: file ?? false,
            };
            return acc;
        },
        {} as { [K in keyof T]: FieldConfig<T[K]> },
    );
}

function RowGenerator<T extends z.infer<typeof baseSchema>>({
    type,
    data,
    config,
    schema,
    create,
}: {
    type: TableTypes;
    data: T;
    schema: z.ZodType<
        { [K in keyof T]: ReturnType<FieldConfig<T[K]>["toSchemaType"]> } & { type: TableTypes },
        { [K in keyof T]: ReturnType<FieldConfig<T[K]>["toSchemaType"]> } & { type: TableTypes }
    >;
    config: { [K in keyof T]: FieldConfig<T[K]> };
    create?: boolean;
}) {
    const [row, setRow] = useState<T>(data);
    useEffect(() => {
        setRow(data);
    }, [data]);

    const defaultValues: z.infer<typeof schema> = useMemo(() => {
        const values = {} as { [K in keyof T]: ReturnType<FieldConfig<T[K]>["toSchemaType"]> };
        (Object.keys(config) as (keyof T)[]).forEach((col) => {
            values[col] = config[col].toSchemaType(row[col]);
        });
        return { ...values, type };
    }, [config, row, type]);

    const [bState, setBState] = useState<
        "idle" | "edit" | "save" | "delete" | "create" | "ssubmit" | "dsubmit" | "csubmit"
    >("idle");
    const fetcher = useFetcher<z.infer<typeof schema>>();
    const form = useAppForm({
        defaultValues,
        validators: {
            onChangeAsync: onChangeAsync(schema),
            onChangeAsyncDebounceMs: 300,
            onSubmit: ({ formApi }) => {
                const errors = formApi.parseValuesWithSchema(schema);
                if (!errors) return errors;
                setBState((prev) => {
                    if (prev === "dsubmit") return "idle";
                    if (prev === "ssubmit") return "edit";
                    if (prev === "csubmit") return "idle";
                    return prev;
                });
                return errors;
            },
        },
        onSubmit: async ({ value }) => {
            const methodMap: Partial<Record<typeof bState, HTMLFormMethod>> = {
                csubmit: "post",
                ssubmit: "put",
                dsubmit: "delete",
            };
            const method = methodMap[bState];
            const form = new FormData();
            form.append("data", JSON.stringify(value));
            if (value.url instanceof File) form.append("url", value.url as File, value.url.name);
            await fetcher.submit(form, { method, encType: "multipart/form-data" });
        },
    });
    const isSubmitted = useStore(form.store, (state) => state.isSubmitted);

    useEffect(() => {
        if (isSubmitted && bState.includes("submit") && fetcher.state === "idle") {
            setBState("idle");
            form.reset(defaultValues);
            setRow((fetcher.data as T) ?? row);
        }
    }, [bState, defaultValues, fetcher.data, fetcher.state, form, isSubmitted, row]);
    const tempref = useRef<HTMLInputElement>(null);
    return (
        <form.AppForm>
            <form onSubmit={(e) => e.preventDefault()} className={TableRow({}).props.className}>
                {(Object.keys(config) as (keyof T extends string ? keyof T : never)[]).map((col) => (
                    <TableCell className="text-center" key={col}>
                        <form.AppField name={col}>
                            {(field) => (
                                <form.Item>
                                    <field.Control>
                                        {!Array.isArray(field.state.value) ? (
                                            <Input
                                                type={config[col].file && create ? "file" : "text"}
                                                inputMode="numeric"
                                                value={
                                                    config[col].file && create
                                                        ? undefined
                                                        : (field.state.value as string) || ""
                                                }
                                                accept="image/*"
                                                name={col}
                                                onChange={(e) => {
                                                    if (config[col].file && create)
                                                        field.handleChange(
                                                            e.target.files?.[0] as typeof field.state.value,
                                                        );
                                                    else field.handleChange(e.target.value as typeof field.state.value);
                                                }}
                                                onBlur={field.handleBlur}
                                                className="text-center read-only:opacity-100! border-primary/50 read-only:border-primary/10"
                                                readOnly={
                                                    (config[col].file && !create) ||
                                                    config[col].disabled ||
                                                    (!["edit", "save"].includes(bState) && !create) ||
                                                    bState.includes("submit")
                                                }
                                            />
                                        ) : (
                                            <AlertDialog>
                                                <AlertDialogTrigger
                                                    render={
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            className="text-center disabled:opacity-100! border-primary/50 disabled:border-primary/10"
                                                        />
                                                    }
                                                >
                                                    Edit
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader className="flex flex-col gap-1 items-center">
                                                        <AlertDialogTitle>
                                                            Edit {col} for {type} ID: {row.id}
                                                        </AlertDialogTitle>
                                                        <div className="flex w-full max-w-md flex-col gap-2">
                                                            <ItemGroup className="gap-2" role="list">
                                                                {field.state.value?.map((val, index) => (
                                                                    <Item
                                                                        key={index}
                                                                        variant="outline"
                                                                        role="listitem"
                                                                        className="w-full hover:bg-secondary"
                                                                    >
                                                                        {config[col].render(val)}
                                                                        <ItemActions>
                                                                            <Button
                                                                                variant="outline"
                                                                                size="sm"
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    field.handleChange((old) => {
                                                                                        if (old == null) return old;
                                                                                        if (!Array.isArray(old))
                                                                                            return old;
                                                                                        return old.filter(
                                                                                            (_, i) => i !== index,
                                                                                        ) as typeof old;
                                                                                    });
                                                                                }}
                                                                            >
                                                                                <Trash className="w-4" />
                                                                            </Button>
                                                                        </ItemActions>
                                                                    </Item>
                                                                ))}
                                                                <Item
                                                                    variant="outline"
                                                                    role="listitem"
                                                                    className="w-full hover:bg-secondary"
                                                                >
                                                                    <ItemContent className="flex items-center justify-center">
                                                                        <ItemTitle className="line-clamp-1 w-full">
                                                                            <Input type="text" ref={tempref} />
                                                                        </ItemTitle>
                                                                    </ItemContent>

                                                                    <ItemActions>
                                                                        <Button
                                                                            className="p-2 mx-1 relative overflow-hidden group"
                                                                            variant="outline"
                                                                            type="button"
                                                                            onClick={() => {
                                                                                field.handleChange((old) => {
                                                                                    if (old == null)
                                                                                        return [
                                                                                            tempref.current?.value ??
                                                                                                "",
                                                                                        ] as typeof old;
                                                                                    if (!Array.isArray(old)) return old;
                                                                                    return [
                                                                                        ...old,
                                                                                        tempref.current?.value ?? "",
                                                                                    ] as typeof old;
                                                                                });
                                                                            }}
                                                                        >
                                                                            <Plus className="w-7" />
                                                                        </Button>
                                                                    </ItemActions>
                                                                </Item>
                                                            </ItemGroup>
                                                        </div>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter className="mt-2">
                                                        <AlertDialogCancel
                                                            onClick={() => {
                                                                field.handleChange(
                                                                    config[col].toSchemaType(
                                                                        row[col],
                                                                    ) as typeof field.state.value,
                                                                );
                                                            }}
                                                        >
                                                            Cancel
                                                        </AlertDialogCancel>
                                                        <AlertDialogAction>Continue</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        )}
                                    </field.Control>
                                    <field.Message className="text-wrap text-center" />
                                </form.Item>
                            )}
                        </form.AppField>
                    </TableCell>
                ))}
                <TableCell className="text-center items-center justify-center w-0">
                    <form.Subscribe selector={(state) => state.canSubmit}>
                        {(canSubmit) => (
                            <>
                                {create ? (
                                    <Button
                                        className="p-2 mx-1 relative overflow-hidden group"
                                        variant="outline"
                                        type="button"
                                        onClick={() => {
                                            if (fetcher.state === "idle" && bState === "create" && canSubmit) {
                                                form.handleSubmit();
                                                setBState("csubmit");
                                            }
                                        }}
                                        disabled={bState.includes("submit")}
                                    >
                                        {["idle", "create"].includes(bState) && (
                                            <ConfirmAnim
                                                className="bg-green-700 duration-500"
                                                onConfirm={() => {
                                                    setBState((prev) => (prev === "idle" ? "create" : prev));
                                                }}
                                                onStart={() => setBState((prev) => (prev === "create" ? "idle" : prev))}
                                            />
                                        )}
                                        {bState === "csubmit" ? <Spinner /> : <Plus className="w-7 relative z-10" />}
                                    </Button>
                                ) : (
                                    <>
                                        <Button
                                            className="p-2 mx-1 relative overflow-hidden group"
                                            variant="outline"
                                            type="button"
                                            disabled={bState == "idle"}
                                            onClick={() => {
                                                form.reset();
                                                setBState("idle");
                                            }}
                                        >
                                            <X className="w-7 relative z-10" />
                                        </Button>
                                        <Button
                                            className="p-2 mx-1 relative overflow-hidden group"
                                            variant="outline"
                                            type="button"
                                            onClick={() => {
                                                if (fetcher.state === "idle" && bState === "save" && canSubmit) {
                                                    form.handleSubmit();
                                                    setBState("ssubmit");
                                                }
                                                setBState((prev) => (prev === "idle" ? "edit" : prev));
                                            }}
                                            disabled={bState.includes("submit")}
                                        >
                                            {["edit", "save"].includes(bState) && (
                                                <ConfirmAnim
                                                    className="bg-blue-500"
                                                    onConfirm={() =>
                                                        setBState((prev) => (prev === "edit" ? "save" : prev))
                                                    }
                                                    onStart={() =>
                                                        setBState((prev) => (prev === "save" ? "edit" : prev))
                                                    }
                                                />
                                            )}
                                            <Pencil
                                                className={
                                                    "transition-all " +
                                                    (!["edit", "save", "ssubmit"].includes(bState)
                                                        ? "scale-100 rotate-0"
                                                        : "scale-0 -rotate-90")
                                                }
                                            />
                                            <Check
                                                className={
                                                    "transition-all absolute " +
                                                    (["edit", "save"].includes(bState)
                                                        ? "scale-100 rotate-0"
                                                        : "scale-0 rotate-90")
                                                }
                                            />
                                            {bState === "ssubmit" && <Spinner className="absolute inset-0 m-auto" />}
                                        </Button>
                                        <Button
                                            className="p-2 mx-1 relative overflow-hidden group"
                                            variant="outline"
                                            type="button"
                                            onClick={() => {
                                                if (fetcher.state === "idle" && bState === "delete" && canSubmit) {
                                                    form.handleSubmit();
                                                    setBState("dsubmit");
                                                }
                                            }}
                                            disabled={bState.includes("submit")}
                                        >
                                            {["idle", "delete"].includes(bState) && (
                                                <ConfirmAnim
                                                    className="bg-red-500"
                                                    onConfirm={() => {
                                                        setBState((prev) => (prev === "idle" ? "delete" : prev));
                                                    }}
                                                    onStart={() =>
                                                        setBState((prev) => (prev === "delete" ? "idle" : prev))
                                                    }
                                                />
                                            )}
                                            {bState === "dsubmit" ? (
                                                <Spinner />
                                            ) : (
                                                <Trash className="w-7 relative z-10" />
                                            )}
                                        </Button>
                                    </>
                                )}
                            </>
                        )}
                    </form.Subscribe>
                </TableCell>
            </form>
        </form.AppForm>
    );
}

function TableGenerator<T extends z.infer<typeof baseSchema>>({
    data,
    type,
    schema,
    config,
}: {
    data: T[];
    type: TableTypes;
    schema: z.ZodType<
        { [K in keyof T]: ReturnType<FieldConfig<T[K]>["toSchemaType"]> } & { type: TableTypes },
        { [K in keyof T]: ReturnType<FieldConfig<T[K]>["toSchemaType"]> } & { type: TableTypes }
    >;
    config: { [K in keyof T]: FieldConfig<T[K]> };
}) {
    return (
        <Table className="px-10">
            <TableCaption className="text-center">{type} CRUD table</TableCaption>
            <TableHeader>
                <TableRow>
                    {Object.keys(config).map((col) => (
                        <TableHead className="text-center" key={col}>
                            {col}
                        </TableHead>
                    ))}
                    <TableHead className="text-center">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.map((item) => (
                    <RowGenerator type={type} key={item.id} data={item} config={config} schema={schema} />
                ))}
                <RowGenerator type={type} data={{} as T} config={config} schema={schema} create />
            </TableBody>
        </Table>
    );
}

export async function loader() {
    const client = getClient();
    const { data: products, error: perror } = await client.GET("/products/");
    const { data: categories, error: cerror } = await client.GET("/categories/");
    const { data: images, error: ierror } = await client.GET("/images/");
    if (perror || cerror || ierror) {
        throw new Response("Failed to load data", { status: 500 });
    }
    return { products, categories, images };
}

export default function Admin({ loaderData }: Route.ComponentProps) {
    const BaseConfig = ConfigGenerator<{ id?: string; created_at?: string | null; updated_at?: string | null }>([
        { name: "id", disabled: true },
        { name: "created_at", disabled: true },
        { name: "updated_at", disabled: true },
    ]);

    const PConfig = {
        ...BaseConfig,
        ...ConfigGenerator<Product>([
            { name: "name" },
            { name: "description" },
            { name: "price" },
            { name: "catid" },
            {
                name: "images",
                toSchemaType: (data) => (Array.isArray(data) ? data.map((d) => String(d.id)) : []),
                fromSchemaType: (value) =>
                    Array.isArray(value)
                        ? value.reduce((acc, id) => {
                              const img = loaderData.images.find((i) => i.id === id);
                              if (img) acc.push(img);
                              return acc;
                          }, [] as Image[])
                        : [],

                render: (value) => {
                    const img = loaderData.images.find((i) => i.id === value);
                    return (
                        <>
                            <ItemMedia variant="image">
                                <Img
                                    src={img?.url}
                                    alt={img?.alt || ""}
                                    width={32}
                                    height={32}
                                    className="object-cover"
                                />
                            </ItemMedia>
                            <ItemContent>
                                <ItemTitle className="line-clamp-1">{img?.id}</ItemTitle>
                            </ItemContent>
                        </>
                    );
                },
            },
        ]),
    };
    const CConfig = {
        ...BaseConfig,
        ...ConfigGenerator<Category>([{ name: "name" }, { name: "description" }]),
    };

    const IConfig = {
        ...BaseConfig,
        ...ConfigGenerator<Image>([{ name: "url", file: true }, { name: "alt" }]),
    };

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
            <div className="flex flex-col">
                <div className="p-4 rounded shadow">
                    <h2 className="text-xl font-semibold mb-2">Products</h2>
                    <TableGenerator data={loaderData.products} type="Product" schema={productSchema} config={PConfig} />
                </div>
                <div className="p-4 rounded shadow">
                    <h2 className="text-xl font-semibold mb-2">Categories</h2>
                    <TableGenerator
                        data={loaderData.categories}
                        type="Category"
                        schema={categorySchema}
                        config={CConfig}
                    />
                </div>
                <div className="p-4 rounded shadow">
                    <h2 className="text-xl font-semibold mb-2">Images</h2>
                    <TableGenerator data={loaderData.images} type="Image" schema={imageSchema} config={IConfig} />
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
