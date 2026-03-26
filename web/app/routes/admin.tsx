import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Route } from "./+types/admin";
import { Check, Pencil, Plus, Trash, X } from "lucide-react";
import type { Product, Category, PageHandle, Image } from "@/types";
import { z } from "zod";
import { useAppForm } from "@/components/ui/form-tanstack";
import { Input } from "@/components/ui/input";
import { Any2FormData, cn, getClient, onChangeAsync } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useMemo, type JSX } from "react";
import { type HTMLFormMethod } from "react-router";
import { Spinner } from "@/components/ui/spinner";
import { useStore } from "@tanstack/react-form";
import { Img } from "@/components/img-wrapper";
import { ButtonGroup } from "@/components/ui/button-group";
import { Drawer, DrawerClose, DrawerContent, DrawerPopup, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { toast } from "sonner";
import { fileStorageConfig, UPLOAD_URL } from "@/config";
import { StatusCodes } from "http-status-codes";
import { CsrfContext } from "@/context";

export type SchemaType = string | number | null | File | undefined | (string | number | null)[];
export type TableTypes = "Product" | "Category" | "Image" | "Product Images";

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
    name: string;
    disabled: boolean;
    render: (props: React.ComponentProps<typeof Input> & { create?: boolean }) => JSX.Element;
    toSchemaType: (data: T) => SchemaType;
    fromSchemaType: (value: SchemaType) => T;
    file: boolean;

    nested?: T extends (infer U)[] ? (U extends z.infer<typeof baseSchema> ? Config<U> : undefined) : undefined;
};

type Config<T extends z.infer<typeof baseSchema>, K extends keyof T & string = keyof T & string> = {
    TableType: TableTypes;
    onSubmit: (params: {
        config: Config<T, K>;
        method: HTMLFormMethod;
        value: Partial<Record<K, SchemaType>>;
    }) => T | Promise<T>;
    fields: FieldConfig<T[K]>[];
    $schema: z.ZodType<Partial<Record<K, SchemaType>>, Partial<Record<K, SchemaType>>>;
};

function FieldConfigDefaults<T extends z.infer<typeof baseSchema>, K extends keyof T & string = keyof T & string>(
    fields: (Partial<FieldConfig<T[K]>> & { key: K })[],
): FieldConfig<T[K]>[] {
    return fields.map((field) => ({
        name: field.key,
        disabled: false,
        render: ({ create, ...props }) => {
            void create;
            return <Input {...props} />;
        },
        toSchemaType: (data) => {
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
        },
        fromSchemaType: (value) => value as T[K],
        file: false,

        ...field,
    }));
}

function RowGenerator<T extends z.infer<typeof baseSchema>, K extends keyof T & string = keyof T & string>({
    row,
    config,
    create,
    onSubmit,
}: {
    row: T;
    config: Config<T, K>;
    create?: boolean;
    onSubmit: Config<T, K>["onSubmit"];
}) {
    const defaultValues: z.infer<typeof config.$schema> = useMemo(() => {
        const values = {} as Record<K, SchemaType>;
        config.fields.forEach((field) => {
            values[field.key as K] = field.toSchemaType(row[field.key as K]);
        });
        return { ...values };
    }, [config, row]);

    const [bState, setBState] = useState<
        "idle" | "edit" | "save" | "delete" | "create" | "ssubmit" | "dsubmit" | "csubmit"
    >("idle");
    const form = useAppForm({
        defaultValues,
        validators: {
            onChangeAsync: onChangeAsync(config.$schema),
            onChangeAsyncDebounceMs: 300,
            onSubmit: ({ formApi }) => {
                const errors = formApi.parseValuesWithSchema(config.$schema);
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
            const method = methodMap[bState]!;
            // TODO: better error handling/pydantic to tanstack error translation
            try {
                await onSubmit({ config, method, value });
            } catch {
                form.reset();
            }
        },
    });
    const isSubmitted = useStore(form.store, (state) => state.isSubmitted);

    useEffect(() => {
        if (isSubmitted && bState.includes("submit")) {
            setBState("idle");
            form.reset(defaultValues);
        }
    }, [bState, defaultValues, form, isSubmitted, row]);
    return (
        <form.AppForm>
            <form onSubmit={(e) => e.preventDefault()} className={TableRow({}).props.className}>
                {config.fields.map((fieldconfig, index) => (
                    <TableCell className="text-center" key={index}>
                        <form.AppField name={fieldconfig.key}>
                            {(field) => (
                                <field.Control>
                                    <form.Item>
                                        {!fieldconfig.nested ? (
                                            fieldconfig.render({
                                                type: "text",
                                                inputMode: "numeric",
                                                value:
                                                    field.state.value instanceof File
                                                        ? field.state.value.name
                                                        : String(field.state.value ?? ""),
                                                name: fieldconfig.name,
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
                                                    (fieldconfig.file && !create) ||
                                                    fieldconfig.disabled ||
                                                    (!["edit", "save"].includes(bState) && !create) ||
                                                    bState.includes("submit"),
                                                create,
                                            })
                                        ) : (
                                            <Drawer swipeDirection="down" snapPoints={["65rem", 1]}>
                                                <DrawerTrigger
                                                    render={
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            className="text-center disabled:opacity-70! border-primary/50 disabled:border-primary/10 disabled:bg-transparent"
                                                            disabled={
                                                                fieldconfig.disabled ||
                                                                (!["edit", "save"].includes(bState) && !create) ||
                                                                bState.includes("submit")
                                                            }
                                                        />
                                                    }
                                                >
                                                    Edit
                                                </DrawerTrigger>
                                                <DrawerPopup className="min-h-screen">
                                                    <DrawerContent className="">
                                                        <DrawerTitle>
                                                            Edit {fieldconfig.name} for {config.TableType} ID:{" "}
                                                            {create ? "New" : row.id}
                                                        </DrawerTitle>

                                                        <TableGenerator
                                                            config={fieldconfig.nested}
                                                            data={
                                                                fieldconfig.fromSchemaType(
                                                                    field.state.value as SchemaType,
                                                                ) as Record<string, SchemaType>[]
                                                            }
                                                            onSubmit={(rows) => {
                                                                const updatedValue = fieldconfig.toSchemaType(
                                                                    rows as T[K],
                                                                );
                                                                field.handleChange(
                                                                    updatedValue as typeof field.state.value,
                                                                );
                                                            }}
                                                        />

                                                        <div className="flex items-center gap-2 w-full justify-center">
                                                            <DrawerClose data- render={<Button size="sm" />}>
                                                                Close
                                                            </DrawerClose>
                                                        </div>
                                                    </DrawerContent>
                                                </DrawerPopup>
                                            </Drawer>
                                        )}
                                        <field.Message className="text-wrap text-center" />
                                    </form.Item>
                                </field.Control>
                            )}
                        </form.AppField>
                    </TableCell>
                ))}
                <TableCell className="text-center items-center justify-center w-0">
                    <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
                        {([canSubmit, isSubmitting]) => (
                            <>
                                {create ? (
                                    <Button
                                        className="p-2 mx-1 relative overflow-hidden group"
                                        variant="outline"
                                        type="button"
                                        onClick={() => {
                                            if (!isSubmitting && bState === "create" && canSubmit) {
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
                                        {bState === "csubmit" ? <Spinner /> : <Plus className="w-7 relative" />}
                                    </Button>
                                ) : (
                                    <>
                                        <Button
                                            className="p-2 mx-1 relative overflow-hidden group"
                                            variant="outline"
                                            type="button"
                                            onClick={() => {
                                                if (!isSubmitting && bState === "save" && canSubmit) {
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
                                                if (!isSubmitting && bState === "delete" && canSubmit) {
                                                    setBState("dsubmit");
                                                    form.handleSubmit();
                                                } else if (!isSubmitting && !bState.includes("submit")) {
                                                    setBState("idle");
                                                    form.reset();
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
                                                <>
                                                    <Trash
                                                        className={
                                                            "transition-all " +
                                                            (["idle", "delete", "dsubmit"].includes(bState)
                                                                ? "scale-100 rotate-0"
                                                                : "scale-0 -rotate-90")
                                                        }
                                                    />
                                                    <X
                                                        className={
                                                            "transition-all absolute " +
                                                            (!["idle", "delete", "dsubmit"].includes(bState)
                                                                ? "scale-100 rotate-0"
                                                                : "scale-0 rotate-90")
                                                        }
                                                    />
                                                </>
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
    config,
    onSubmit,
}: {
    data: T[];
    config: Config<T, K>;
    onSubmit?: (updatedRows: T[]) => void;
}) {
    const [rows, setRows] = useState<T[]>(data);
    useEffect(() => {
        setRows(data);
    }, [data]);

    return (
        <Table className="px-10">
            <TableCaption className="text-center">{config.TableType} CRUD table</TableCaption>
            <TableHeader>
                <TableRow>
                    {config.fields.map((field, index) => (
                        <TableHead className="text-center" key={index}>
                            {field.name}
                        </TableHead>
                    ))}
                    <TableHead className="text-center">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {rows.map((item) => (
                    <RowGenerator
                        key={item.id}
                        row={item}
                        config={config}
                        onSubmit={async ({ config, method, value }) => {
                            const result = await config.onSubmit({ config, method, value });

                            if (method === "put") {
                                setRows((prev) => {
                                    const next = prev.map((row) =>
                                        row.id === item.id ? ({ ...row, ...value, id: item.id } as T) : row,
                                    );
                                    onSubmit?.(next);
                                    return next;
                                });
                            } else if (method === "delete") {
                                setRows((prev) => {
                                    const next = prev.filter((row) => row.id !== item.id);
                                    onSubmit?.(next);
                                    return next;
                                });
                            }

                            return result;
                        }}
                    />
                ))}
                <RowGenerator
                    row={{} as T}
                    config={config}
                    create
                    onSubmit={async ({ config, method, value }) => {
                        const result = await config.onSubmit({ config, method, value });
                        if (method === "post") {
                            setRows((prev) => {
                                const next = [...prev, result];
                                onSubmit?.(next);
                                return next;
                            });
                        }
                        return result;
                    }}
                />
            </TableBody>
        </Table>
    );
}

export async function loader({ context }: Route.LoaderArgs) {
    const client = getClient();
    const { data: products, error: perror } = await client.GET("/products/");
    const { data: categories, error: cerror } = await client.GET("/categories/");
    const { data: images, error: ierror } = await client.GET("/images/");
    const csrf = context.get(CsrfContext);
    if (perror || cerror || ierror || !csrf) {
        throw new Response("Failed to load data", { status: StatusCodes.INTERNAL_SERVER_ERROR });
    }
    return { products, categories, images, csrf };
}

export default function Admin({ loaderData }: Route.ComponentProps) {
    const onSubmit = async <T extends z.infer<typeof baseSchema>, K extends keyof T & string = keyof T & string>(
        ...[{ config, method, value }]: Parameters<Config<T, K>["onSubmit"]>
    ) => {
        const form = Any2FormData(value);
        form.append("TableType", config.TableType);
        const response = await fetch("/api/admin", {
            method,
            body: form,
            headers: {
                "X-CSRF-Token": loaderData.csrf,
            },
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

    const PConfig: Config<Product> = {
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
                              const img = loaderData.images.find((i) => i.id === id);
                              if (img) acc.push(img);
                              return acc;
                          }, [] as Image[])
                        : [],
                nested: {
                    TableType: "Product Images",
                    $schema: baseSchema,
                    onSubmit: ({ value }) => {
                        const img = loaderData.images.find((i) => i.id === value.id);
                        if (!img) throw new Error("Image not found");
                        return img;
                    },
                    fields: FieldConfigDefaults<Image>([
                        {
                            key: "url",
                            name: "preview",
                            disabled: true,
                            render: ({ create, value }) => {
                                console.log(value);
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
    const CConfig: Config<Category> = {
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

    const IConfig: Config<Image> = {
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
                    <h2 className="text-xl font-semibold mb-2">Products</h2>
                    <TableGenerator data={loaderData.products} config={PConfig} />
                </div>
                <div className="p-4 rounded shadow">
                    <h2 className="text-xl font-semibold mb-2">Categories</h2>
                    <TableGenerator data={loaderData.categories} config={CConfig} />
                </div>
                <div className="p-4 rounded shadow">
                    <h2 className="text-xl font-semibold mb-2">Images</h2>
                    <TableGenerator data={loaderData.images} config={IConfig} />
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
