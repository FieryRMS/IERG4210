import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Route } from "./+types/admin";
import { Check, Pencil, Plus, Trash, X } from "lucide-react";
import type { Product, Category, PageHandle, Image } from "@/types";
import { z } from "zod";
import { useAppForm } from "@/components/ui/form-tanstack";
import { Input } from "@/components/ui/input";
import { cn, getClient, onChangeAsync } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useMemo, type JSX } from "react";
import { useFetcher, type HTMLFormMethod } from "react-router";
import { Spinner } from "@/components/ui/spinner";
import { useStore } from "@tanstack/react-form";
import { type FileUpload, parseFormData } from "@remix-run/form-data-parser";
import { getStorageKey, fileStorage } from "@/storage";
import { fileStorageConfig, UPLOAD_URL } from "@/config";
import { Img } from "@/components/img-wrapper";
import { ButtonGroup } from "@/components/ui/button-group";

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
    url: z.union([
        z.url({
            protocol: /^https?$/,
            hostname: z.regexes.domain,
        }),
        z.string().regex(new RegExp(`^${UPLOAD_URL}`)),
        z.file().max(fileStorageConfig.maxFileSize!),
    ]),
    alt: z.string().nullable().optional(),
    type: z.literal("Image"),
});

type SchemaType = string | number | null | File | undefined | (string | number | null)[];
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

    const type = form.get("type");
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

type FieldConfig<T> = {
    key: string;
    disabled: boolean;
    render: (props: React.ComponentProps<typeof Input> & { create?: boolean }) => JSX.Element;
    toSchemaType: (data: T) => SchemaType;
    fromSchemaType: (value: SchemaType) => T;
    file: boolean;
    nested?: T extends (infer U)[]
        ? U extends z.infer<typeof baseSchema>
            ? ReturnType<typeof ConfigGenerator<U>>
            : undefined
        : undefined;
};
function ConfigGenerator<T extends z.infer<typeof baseSchema>, K extends keyof T & string = keyof T & string>(
    fields: (Partial<FieldConfig<T[K]>> & {
        key: K;
        name?: string;
    })[],
) {
    return fields.reduce(
        (acc, { key, name, disabled, render, toSchemaType, fromSchemaType, file, nested }) => {
            (acc as Record<string, FieldConfig<T[K]>>)[name ?? key] = {
                key,
                disabled: disabled ?? false,
                render:
                    render ??
                    (({ create, ...props }) => {
                        void create;
                        return <Input {...props} />;
                    }),
                toSchemaType:
                    toSchemaType ??
                    ((data) => {
                        if (Array.isArray(data))
                            return data.map((item) => {
                                if (item === null || item === undefined) return null;
                                if (typeof item === "object") return JSON.stringify(item);
                                if (typeof item === "number") return item;
                                return String(item);
                            });
                        if (data === null || data === undefined) return null;
                        if (typeof data === "object") return JSON.stringify(data);
                        if (typeof data === "number") return data;
                        return String(data);
                    }),
                fromSchemaType: fromSchemaType ?? ((value) => value as T[K]),
                file: file ?? false,
                nested: nested ?? undefined,
            };
            return acc;
        },
        {} as Record<K | string, FieldConfig<T[K]>>,
    );
}

function RowGenerator<T extends z.infer<typeof baseSchema>, K extends keyof T & string = keyof T & string>({
    type,
    data,
    config,
    schema,
    create,
    onSubmit,
}: {
    type: TableTypes;
    data: T;
    schema: z.ZodType<
        Partial<Record<K, SchemaType>> & { type: TableTypes },
        Partial<Record<K, SchemaType>> & { type: TableTypes }
    >;
    config: ReturnType<typeof ConfigGenerator<T>>;
    create?: boolean;
    onSubmit?: ({ value }: { value: z.infer<typeof schema> }) => void | Promise<void>;
}) {
    const [row, setRow] = useState<T>(data);
    useEffect(() => {
        setRow(data);
    }, [data]);

    const defaultValues: z.infer<typeof schema> = useMemo(() => {
        const values = {} as Partial<Record<K, SchemaType>>;
        (Object.keys(config) as K[]).forEach((col) => {
            if (col in row) values[col] = config[col].toSchemaType(row[col]); //  ts infers col as string, may be bug prone later
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
        onSubmit:
            onSubmit ??
            (async ({ value }) => {
                const methodMap: Partial<Record<typeof bState, HTMLFormMethod>> = {
                    csubmit: "post",
                    ssubmit: "put",
                    dsubmit: "delete",
                };
                const method = methodMap[bState];
                const form = new FormData();
                (Object.entries(value) as [K, SchemaType][]).forEach(([key, val]) => {
                    // if serializable, then add as JSON string, otherwise add as is (for file uploads)
                    if (val == null || val == undefined) {
                        return;
                    }
                    if (typeof val === "string" || typeof val === "number") {
                        form.append(key, String(val));
                    } else if (Array.isArray(val)) {
                        val.forEach((item) => {
                            if (typeof item === "string" || typeof item === "number") {
                                form.append(key, String(item));
                            }
                        });
                    } else {
                        form.append(key, val);
                    }
                });
                await fetcher.submit(form, { method, encType: "multipart/form-data" });
            }),
    });
    const isSubmitted = useStore(form.store, (state) => state.isSubmitted);

    useEffect(() => {
        if (isSubmitted && bState.includes("submit") && fetcher.state === "idle") {
            setBState("idle");
            form.reset(defaultValues);
            setRow((fetcher.data as T) ?? row);
        }
    }, [bState, defaultValues, fetcher.data, fetcher.state, form, isSubmitted, row]);
    return (
        <form.AppForm>
            <form onSubmit={(e) => e.preventDefault()} className={TableRow({}).props.className}>
                {(Object.keys(config) as (keyof T extends string ? keyof T : never)[]).map((col) => (
                    <TableCell className="text-center" key={col}>
                        <form.AppField name={config[col].key}>
                            {(field) => (
                                <form.Item>
                                    <field.Control>
                                        {config[col].render({
                                            type: "text",
                                            inputMode: "numeric",
                                            value:
                                                field.state.value instanceof File
                                                    ? field.state.value.name
                                                    : String(field.state.value ?? ""),
                                            name: col,
                                            onChange: (e) => {
                                                console.log(e);
                                                if (e.target.files) {
                                                    const file = e.target.files[0];
                                                    if (file) {
                                                        // Active bug in Tanstack: https://github.com/TanStack/form/issues/1932#issuecomment-3656323010
                                                        Object.defineProperties(file, {
                                                            name: {
                                                                value: file.name,
                                                                enumerable: true,
                                                            },
                                                            size: {
                                                                value: file.size,
                                                                enumerable: true,
                                                            },
                                                            type: {
                                                                value: file.type,
                                                                enumerable: true,
                                                            },
                                                        });
                                                        field.handleChange(file as typeof field.state.value);
                                                        return;
                                                    }
                                                }
                                                field.handleChange(e.target.value as typeof field.state.value);
                                            },
                                            className:
                                                "text-center read-only:opacity-80! border-primary/50 read-only:border-primary/10",
                                            readOnly:
                                                (config[col].file && !create) ||
                                                config[col].disabled ||
                                                (!["edit", "save"].includes(bState) && !create) ||
                                                bState.includes("submit"),
                                            create,
                                        })}
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
                                            disabled={!["idle", "delete"].includes(bState)}
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

function TableGenerator<T extends z.infer<typeof baseSchema>, K extends keyof T & string = keyof T & string>({
    data,
    type,
    schema,
    config,
    onSubmit,
}: {
    data: T[];
    type: TableTypes;
    schema: z.ZodType<
        Partial<Record<K, SchemaType>> & { type: TableTypes },
        Partial<Record<K, SchemaType>> & { type: TableTypes }
    >;
    config: ReturnType<typeof ConfigGenerator<T>>;
    onSubmit?: ({ value }: { value: z.infer<typeof schema> }) => void | Promise<void>;
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
                    <RowGenerator
                        type={type}
                        key={item.id}
                        data={item}
                        config={config}
                        schema={schema}
                        onSubmit={onSubmit}
                    />
                ))}
                <RowGenerator type={type} data={{} as T} config={config} schema={schema} create onSubmit={onSubmit} />
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
    const baseConfigFor = <T extends z.infer<typeof baseSchema>>() =>
        ConfigGenerator<T>([
            { key: "id", disabled: true },
            { key: "created_at", disabled: true },
            { key: "updated_at", disabled: true },
        ]);

    const PConfig = {
        ...baseConfigFor<Product>(),
        ...ConfigGenerator<Product>([
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
                              const img = loaderData.images.find((i) => i.id === id);
                              if (img) acc.push(img);
                              return acc;
                          }, [] as Image[])
                        : [],
                nested: ConfigGenerator<Image>([
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
                        key: "id",
                        disabled: true,
                    },
                ]),
            },
        ]),
    };
    const CConfig = {
        ...baseConfigFor<Category>(),
        ...ConfigGenerator<Category>([{ key: "name" }, { key: "description" }]),
    };

    const IConfig = {
        ...baseConfigFor<Image>(),
        ...ConfigGenerator<Image>([
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
