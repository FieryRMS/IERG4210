import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { paths } from "@/lib/api";
import createClient from "openapi-fetch";
import type { Route } from "./+types/admin";
import { Check, Pencil, Plus, Trash } from "lucide-react";
import type { Product, Category } from "@/types";
import { z } from "zod";
import { useAppForm } from "@/components/ui/form-tanstack";
import { Input } from "@/components/ui/input";
import { cn, onChangeAsync } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useMemo } from "react";
import { useFetcher, type HTMLFormMethod } from "react-router";
import { Spinner } from "@/components/ui/spinner";
import { useStore } from "@tanstack/react-form";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Item, ItemActions, ItemContent, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item";

const baseSchema = z.object({
    id: z.coerce.number<number>().min(1).optional(),
    name: z.string(),
    description: z.string().nullable(),
    created_at: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{6}$/, "Invalid date format")
        .optional(),
    updated_at: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{6}$/, "Invalid date format")
        .optional(),
});
const productSchema = baseSchema.extend({
    price: z.coerce.number<number>().min(0.01),
    catid: z.coerce.number<number>().min(1),
    images: z.array(z.string()).nullable(),
});

const categorySchema = baseSchema.extend({});

const schema = z.discriminatedUnion("type", [
    productSchema.extend({ type: z.literal("Product") }),
    categorySchema.extend({ type: z.literal("Category") }),
]);

export async function action({ request }: { request: Request }) {
    const client = createClient<paths>({ baseUrl: process.env.API_URL });
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const data: z.infer<typeof schema> = await request.json();

    if (data.type === "Product" && request.method === "POST")
        return (await client.POST("/products/", { body: data })).data;
    else if (data.type === "Product" && request.method === "PUT")
        return (await client.PUT(`/products/{product_id}`, { params: { path: { product_id: data.id! } }, body: data }))
            .data;
    else if (data.type === "Product" && request.method === "DELETE")
        return (await client.DELETE(`/products/{product_id}`, { params: { path: { product_id: data.id! } } })).data;
    else if (data.type === "Category" && request.method === "POST")
        return (await client.POST("/categories/", { body: data })).data;
    else if (data.type === "Category" && request.method === "PUT")
        return (
            await client.PUT(`/categories/{category_id}`, {
                params: { path: { category_id: data.id! } },
                body: data,
            })
        ).data;
    else if (data.type === "Category" && request.method === "DELETE")
        return (await client.DELETE(`/categories/{category_id}`, { params: { path: { category_id: data.id! } } })).data;
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

function RowGenerator({
    type,
    data,
    columns,
    disabled,
}: {
    type: "Product" | "Category";
    data: Product | Category;
    columns: (keyof Product | keyof Category)[];
    disabled: (keyof Product | keyof Category)[];
}) {
    const [row, setRow] = useState(data);
    useEffect(() => {
        setRow(data);
    }, [data]);
    const defaultValues = useMemo(() => (!row.id ? { type } : { ...row, type }) as z.infer<typeof schema>, [row, type]);
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
                setBState((prev) => (prev.includes("submit") ? "idle" : prev));
                return errors;
            },
        },
        onSubmit: async ({ value }) => {
            console.log(value);
            const methodMap: Partial<Record<typeof bState, HTMLFormMethod>> = {
                csubmit: "post",
                ssubmit: "put",
                dsubmit: "delete",
            };
            const method = methodMap[bState];
            await fetcher.submit(value, { method, encType: "application/json" });
        },
    });
    const isSubmitted = useStore(form.store, (state) => state.isSubmitted);

    useEffect(() => {
        if (isSubmitted && bState.includes("submit") && fetcher.state === "idle") {
            setBState("idle");
            form.reset(defaultValues);
            setRow(fetcher.data ?? row);
        }
    }, [bState, defaultValues, fetcher.data, fetcher.state, form, isSubmitted, row]);
    return (
        <form.AppForm>
            <form onSubmit={(e) => e.preventDefault()} className={TableRow({}).props.className}>
                {columns.map((col) => (
                    <TableCell className="text-center" key={col}>
                        <form.AppField name={col as keyof Product}>
                            {(field) => (
                                <form.Item>
                                    <field.Control>
                                        {field.name != "images" ? (
                                            <Input
                                                type="text"
                                                inputMode="numeric"
                                                value={field.state.value ?? ""}
                                                onChange={(e) => field.handleChange(e.target.value)}
                                                onBlur={field.handleBlur}
                                                className="text-center disabled:opacity-100! border-primary/50 disabled:border-primary/10"
                                                disabled={
                                                    disabled.includes(col as keyof (Product | Category)) ||
                                                    (!["edit", "save"].includes(bState) && row.id !== undefined) ||
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
                                                    <AlertDialogHeader className="flex flex-col gap-1">
                                                        <AlertDialogTitle>
                                                            Edit {col} for {row.name}
                                                        </AlertDialogTitle>
                                                        <AlertDialogDescription className="flex w-full max-w-md flex-col gap-2">
                                                            <ItemGroup className="gap-2" role="list">
                                                                {(field.state.value as string[])?.map((image) => (
                                                                    <Item
                                                                        key={image}
                                                                        variant="outline"
                                                                        role="listitem"
                                                                        className="w-full hover:bg-secondary"
                                                                    >
                                                                        <ItemMedia variant="image">
                                                                            <img
                                                                                src={image}
                                                                                alt={image}
                                                                                width={32}
                                                                                height={32}
                                                                                className="object-cover"
                                                                            />
                                                                        </ItemMedia>
                                                                        <ItemContent>
                                                                            <ItemTitle className="line-clamp-1">
                                                                                {image}
                                                                            </ItemTitle>
                                                                        </ItemContent>
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
                                                                                            (img) => img !== image,
                                                                                        );
                                                                                    });
                                                                                }}
                                                                            >
                                                                                <Trash className="w-4" />
                                                                            </Button>
                                                                        </ItemActions>
                                                                    </Item>
                                                                ))}
                                                            </ItemGroup>
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter className="mt-2">
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
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
                <TableCell className="text-center items-center justify-center">
                    <form.Subscribe selector={(state) => state.canSubmit}>
                        {(canSubmit) => (
                            <>
                                {!row.id ? (
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

function TableGenerator({ data, type }: { data: Product[] | Category[]; type: "Product" | "Category" }) {
    type Row = Product | Category;
    const fixed: (keyof Row)[] = ["id", "name", "description", "created_at", "updated_at"];
    const columns: (keyof Row)[] = [
        ...["id", "name", "description"],
        ...(Object.keys(data[0] || {}) as (keyof Row)[]).filter((col) => ![...fixed].includes(col)),
        ...["created_at", "updated_at"],
    ] as (keyof Row)[];
    const disabled: (keyof Row)[] = ["id", "created_at", "updated_at"];
    return (
        <Table className="px-10">
            <TableCaption className="text-center">{type} CRUD table</TableCaption>
            <TableHeader>
                <TableRow>
                    {columns.map((col) => (
                        <TableHead className="text-center" key={col}>
                            {col}
                        </TableHead>
                    ))}
                    <TableHead className="text-center">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.map((item) => (
                    <RowGenerator type={type} key={item.id} data={item} columns={columns} disabled={disabled} />
                ))}
                <RowGenerator
                    type={type}
                    key="new"
                    data={{
                        name: "",
                        price: 0,
                        catid: 0,
                    }}
                    columns={columns}
                    disabled={disabled}
                />
            </TableBody>
        </Table>
    );
}

export async function loader() {
    const client = createClient<paths>({ baseUrl: process.env.API_URL });
    const { data: products, error: perror } = await client.GET("/products/");
    const { data: categories, error: cerror } = await client.GET("/categories/");
    if (perror || cerror) {
        throw new Response("Failed to load data", { status: 500 });
    }
    return { products, categories };
}

export default function Admin({ loaderData }: Route.ComponentProps) {
    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
            <div className="flex flex-col">
                <div className="p-4 rounded shadow">
                    <h2 className="text-xl font-semibold mb-2">Products</h2>
                    <TableGenerator data={loaderData.products} type="Product" />
                </div>
                <div className="p-4 rounded shadow">
                    <h2 className="text-xl font-semibold mb-2">Categories</h2>
                    <TableGenerator data={loaderData.categories} type="Category" />
                </div>
            </div>
        </div>
    );
}
