import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, Pencil, Plus, Trash, X } from "lucide-react";
import { z } from "zod";
import { useAppForm } from "@/components/ui/form-tanstack";
import { Input } from "@/components/ui/input";
import { cn, onChangeAsync } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState, useMemo, type JSX } from "react";
import { type HTMLFormMethod } from "react-router";
import { Spinner } from "@/components/ui/spinner";
import { Drawer, DrawerClose, DrawerContent, DrawerPopup, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";

type SchemaType = string | number | null | File | undefined | (string | number | null)[];

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

type FieldConfig<T, TableTypes extends string = string> = {
    key: string;
    name: string;
    disabled: boolean;
    render: (props: React.ComponentProps<typeof Input> & { create?: boolean }) => JSX.Element;
    toSchemaType: (data: T) => SchemaType;
    fromSchemaType: (value: SchemaType) => T;
    file: boolean;
    nested?: T extends (infer U)[] ? (U extends { id?: string } ? Config<U, TableTypes> : never) : never;
    exclude?: boolean;
};

export type Config<
    T extends { id?: string },
    TableTypes extends string = string,
    K extends keyof T & string = keyof T & string,
> = {
    TableType: TableTypes;
    desc: string;
    disallowed_methods?: {
        post?: boolean;
        put?: boolean;
        delete?: boolean;
    };
    onSubmit: (params: {
        config: Config<T, TableTypes, K>;
        method: HTMLFormMethod;
        value: Partial<Record<K, SchemaType>>;
    }) => T | Promise<T>;
    fields: FieldConfig<T[K], TableTypes>[];
    $schema: z.ZodType<Partial<Record<K, SchemaType>>, Partial<Record<K, SchemaType>>>;
};

export function FieldConfigDefaults<
    T extends { id?: string },
    TableTypes extends string = string,
    K extends keyof T & string = keyof T & string,
>(fields: (Partial<FieldConfig<T[K], TableTypes>> & { key: K })[]): FieldConfig<T[K], TableTypes>[] {
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
        exclude: false,
        ...field,
    }));
}

function RowGenerator<
    T extends { id?: string },
    TableTypes extends string = string,
    K extends keyof T & string = keyof T & string,
>({
    row,
    config,
    create,
    onSubmit,
}: {
    row: T;
    config: Config<T, TableTypes, K>;
    create?: boolean;
    onSubmit: Config<T, TableTypes, K>["onSubmit"];
}) {
    const defaultValues: z.infer<typeof config.$schema> = useMemo(() => {
        const values = {} as Record<K, SchemaType>;
        config.fields.forEach((field) => {
            values[field.key as K] = field.key in row ? field.toSchemaType(row[field.key as K]) : null;
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
        onSubmit: async ({ value, formApi }) => {
            const methodMap: Partial<Record<typeof bState, HTMLFormMethod>> = {
                csubmit: "post",
                ssubmit: "put",
                dsubmit: "delete",
            };
            const method = methodMap[bState]!;
            const dirtyFields = new Set(
                (Object.keys(formApi.fieldInfo) as Array<keyof typeof formApi.fieldInfo>)
                    .filter(
                        (key) =>
                            formApi.getFieldMeta(key)?.isDirty &&
                            !config.fields.find((field) => field.key === key)?.exclude,
                    )
                    .map(String),
            );
            const updatedValue: Partial<Record<K, SchemaType>> = {};
            for (const key of Object.keys(value) as K[]) {
                if (dirtyFields.has(key) || (key === "id" && method !== "post")) {
                    updatedValue[key] = value[key];
                }
            }

            // TODO: better error handling/pydantic to tanstack error translation
            try {
                await onSubmit({ config, method, value: updatedValue });
            } catch {
                form.reset();
            }

            setBState("idle");
            form.reset(defaultValues);
        },
    });
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
                                                    bState.includes("submit") ||
                                                    (create && config.disallowed_methods?.post),
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
                                                                bState.includes("submit") ||
                                                                (create && config.disallowed_methods?.post)
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
                                                            config={
                                                                fieldconfig.nested as Config<
                                                                    { id?: string },
                                                                    TableTypes
                                                                >
                                                            }
                                                            data={
                                                                fieldconfig.fromSchemaType(
                                                                    field.state.value as SchemaType,
                                                                ) as { id?: string }[]
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

                                                        <div className="flex items-center gap-2 w-full justify-center pt-3">
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
                                        disabled={
                                            bState.includes("submit") ||
                                            (bState === "idle" && config.disallowed_methods?.post)
                                        }
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
                                            disabled={
                                                bState.includes("submit") ||
                                                (bState === "idle" && config.disallowed_methods?.put)
                                            }
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
                                            disabled={
                                                bState.includes("submit") ||
                                                (bState === "idle" && config.disallowed_methods?.delete)
                                            }
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

export function TableGenerator<
    T extends { id?: string },
    TableTypes extends string = string,
    K extends keyof T & string = keyof T & string,
>({ data, config, onSubmit }: { data: T[]; config: Config<T, TableTypes, K>; onSubmit: (updatedRows: T[]) => void }) {
    return (
        <Table className="px-10">
            <TableCaption className="text-center">{config.desc}</TableCaption>
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
                {data.map((item) => (
                    <RowGenerator
                        key={item.id}
                        row={item}
                        config={config}
                        onSubmit={async ({ config, method, value }) => {
                            const result = await config.onSubmit({ config, method, value });

                            if (method === "put") {
                                const next = data.map((row) =>
                                    row.id === item.id ? ({ ...row, ...result, id: item.id } as T) : row,
                                );
                                onSubmit?.(next);
                            } else if (method === "delete") {
                                const next = data.filter((row) => row.id !== item.id);
                                onSubmit?.(next);
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
                            const next = [...data, result];
                            onSubmit?.(next);
                        }
                        return result;
                    }}
                />
            </TableBody>
        </Table>
    );
}
