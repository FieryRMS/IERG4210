import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, Pencil, Plus, Trash, X } from "lucide-react";
import { z } from "zod";
import { useAppForm } from "@/components/ui/form-tanstack";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ServerValidationException } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { useState, useMemo, type JSX } from "react";
import { type HTMLFormMethod } from "react-router";
import { Spinner } from "@/components/ui/spinner";
import { Drawer, DrawerClose, DrawerContent, DrawerPopup, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import type { AnyFieldApi, AnyFormApi } from "@tanstack/react-form";
import { toast } from "sonner";

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

type FieldConfig<T extends { id?: string }, TableTypes extends string = string> = {
    [K in keyof T]: {
        key: K;
        name: string;
        disabled: (params: {
            isEditing: boolean;
            create: boolean;
            isSubmitting: boolean;
            methods: Config<T, TableTypes>["methods"];
        }) => boolean;
        Render: (props: {
            create?: boolean;
            disabled: boolean;
            field: AnyFieldApi;
            className?: string;
            form: AnyFormApi;
        }) => JSX.Element;
        toSchemaType: (data: T[K]) => SchemaType;
        fromSchemaType: (value: SchemaType) => T[K];
        file: boolean;
        nested?: T[K] extends (infer U)[]
            ? U extends { id?: string }
                ? Config<U, TableTypes> & { saveOnSubmit?: boolean }
                : never
            : never;
        exclude?: boolean;
    };
}[keyof T];

export type Config<T extends { id?: string }, TableTypes extends string = string, K extends keyof T = keyof T> = {
    TableType: TableTypes;
    desc: string;
    methods: {
        post?: z.ZodObject;
        put?: z.ZodObject;
        delete?: z.ZodObject;
    };
    onSubmit: (params: {
        config: Config<T, TableTypes, K>;
        method: HTMLFormMethod;
        value: Partial<Record<K, SchemaType>>;
    }) => T | Promise<T>;
    fields: FieldConfig<T, TableTypes>[];
};

export function FieldConfigDefaults<
    T extends { id?: string },
    TableTypes extends string = string,
    K extends keyof T = keyof T,
>(fields: (Partial<FieldConfig<T, TableTypes>> & { key: K })[]): FieldConfig<T, TableTypes>[] {
    return fields.map((field) => ({
        name: field.key as string,

        disabled: ({ isEditing, create, isSubmitting, methods }) =>
            (!isEditing && !create) || isSubmitting || methods.post === undefined,
        Render: ({ disabled, field, className }) => {
            return (
                <Input
                    type="text"
                    inputMode="numeric"
                    value={field.state.value ?? ""}
                    name={field.name}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className={className}
                    readOnly={disabled}
                />
            );
        },
        toSchemaType: (data) => data,
        fromSchemaType: (value) => value,
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
    const defaultValues = useMemo(() => {
        const values = {} as Record<K, unknown>;
        config.fields.forEach((field) => {
            if (field.key in row) values[field.key as K] = field.toSchemaType(row[field.key as K]);
        });
        return { ...values };
    }, [config, row]);

    const [bState, setBState] = useState<
        "idle" | "edit" | "save" | "delete" | "create" | "ssubmit" | "dsubmit" | "csubmit"
    >("idle");
    const state2method = (state: typeof bState): HTMLFormMethod | null => {
        if (state === "ssubmit") return "put";
        if (state === "dsubmit") return "delete";
        if (state === "csubmit") return "post";
        return null;
    };
    const method2schema = (method: ReturnType<typeof state2method>) => {
        if (method === "post") return config.methods.post;
        if (method === "put") return config.methods.put;
        if (method === "delete") return config.methods.delete;
        return null;
    };
    const form = useAppForm({
        defaultValues,
        validators: {
            onChangeAsync: ({ formApi }) => {
                let schema: z.ZodObject | undefined;
                if (create) schema = config.methods.post;
                else schema = config.methods.put;
                if (!schema) return;
                const errors = formApi.parseValuesWithSchema(schema);
                if (!errors) return errors;

                const dirtyFields = Object.keys(formApi.fieldInfo).filter(
                    (key) => formApi.getFieldMeta(key as keyof typeof formApi.fieldInfo)!.isDirty,
                );
                return {
                    form: Object.fromEntries(Object.entries(errors.form).filter(([key]) => dirtyFields.includes(key))),
                    fields: Object.fromEntries(
                        Object.entries(errors.fields).filter(([key]) => dirtyFields.includes(key)),
                    ),
                };
            },
            onChangeAsyncDebounceMs: 300,
            onSubmitAsync: async ({ formApi }) => {
                const method = state2method(bState);
                const schema = method2schema(method);
                if (!schema || !method) {
                    toast.error("Unexpected action: Report this to the developers!");
                    return;
                }
                const errors = formApi.parseValuesWithSchema(schema);
                const rollback = () =>
                    setBState((prev) => {
                        if (prev === "dsubmit") return "idle";
                        if (prev === "ssubmit") return "edit";
                        if (prev === "csubmit") return "idle";
                        return prev;
                    });

                if (errors) {
                    toast.error("Validation failed! Please check the form for errors.");
                    rollback();
                    return errors;
                }
                const value = schema.parse(formApi.state.values);

                const dirtyFields = new Set(
                    Object.keys(formApi.fieldInfo)
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
                        updatedValue[key] = value[key] as SchemaType;
                    }
                }

                try {
                    await onSubmit({ config, method, value: updatedValue });
                } catch (e) {
                    let ret: ServerValidationException["errors"] = {
                        form: {
                            _errors: [{ message: "Server Error", code: "SERVER_ERROR", path: [] }],
                        },
                        fields: {},
                    };
                    if (e instanceof ServerValidationException) {
                        ret = e.errors;
                    }
                    rollback();
                    return ret;
                }
                setBState("idle");
            },
        },
        onSubmit: () => {
            form.reset();
        },
    });
    return (
        <form.AppForm>
            <form onSubmit={(e) => e.preventDefault()} className={TableRow({}).props.className}>
                {config.fields.map((fieldconfig, index) => (
                    <TableCell className="text-center" key={index}>
                        <form.AppField name={String(fieldconfig.key)}>
                            {(field) => (
                                <field.Control>
                                    <form.Item>
                                        {!fieldconfig.nested ? (
                                            <fieldconfig.Render
                                                create={create}
                                                disabled={fieldconfig.disabled({
                                                    isEditing: ["edit", "save"].includes(bState),
                                                    create: create || false,
                                                    isSubmitting: bState.includes("submit"),
                                                    methods: config.methods,
                                                })}
                                                field={field}
                                                form={form}
                                                className="text-center read-only:opacity-80! border-primary/50 read-only:border-primary/10"
                                            />
                                        ) : (
                                            <Drawer swipeDirection="down" snapPoints={["65rem", 1]}>
                                                <DrawerTrigger
                                                    render={
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            className="text-center disabled:opacity-80! border-primary/50 disabled:border-primary/10 disabled:bg-transparent"
                                                            disabled={fieldconfig.disabled({
                                                                isEditing: ["edit", "save"].includes(bState),
                                                                create: create || false,
                                                                isSubmitting: bState.includes("submit"),
                                                                methods: config.methods,
                                                            })}
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
                                                                ) as { id?: string }[]
                                                            }
                                                            onSubmit={(rows) => {
                                                                const updatedValue = fieldconfig.toSchemaType(
                                                                    rows as T[K],
                                                                );
                                                                field.handleChange(
                                                                    updatedValue as typeof field.state.value,
                                                                );
                                                                // @ts-expect-error it exists dont worry 🫩
                                                                if (fieldconfig.nested?.saveOnSubmit) {
                                                                    onSubmit({
                                                                        config,
                                                                        method: "put",
                                                                        value: {
                                                                            id: row.id,
                                                                        } as Partial<Record<K, SchemaType>>,
                                                                    });
                                                                }
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
                                                setBState("csubmit");
                                                form.handleSubmit();
                                            }
                                        }}
                                        disabled={bState.includes("submit") || config.methods.post === undefined}
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
                                                    setBState("ssubmit");
                                                    form.handleSubmit();
                                                }
                                                setBState((prev) => (prev === "idle" ? "edit" : prev));
                                            }}
                                            disabled={bState.includes("submit") || config.methods.put === undefined}
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
                                            disabled={bState.includes("submit") || config.methods.delete === undefined}
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
                                    row.id === item.id ? ({ ...row, ...result } as T) : row,
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
