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
import { useState } from "react";
import { useFetcher } from "react-router";

const client = createClient<paths>({ baseUrl: import.meta.env.VITE_API_URL });

export async function action({ request }: { request: Request }) {}

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
});

const categorySchema = baseSchema.extend({
    images: z.string().array().nullable(),
});

const schema = z.discriminatedUnion("type", [
    productSchema.extend({ type: z.literal("Product") }),
    categorySchema.extend({ type: z.literal("Category") }),
]);

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
                    "absolute left-0 top-0 h-full w-0 bg-red-500 group-active:transition-all duration-1800 group-active:w-full",
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
    item,
    columns,
    disabled,
}: {
    type: "Product" | "Category";
    item: Product | Category;
    columns: (keyof Product | keyof Category)[];
    disabled: (keyof Product | keyof Category)[];
}) {
    const productFetcher = useFetcher<Product>();
    const categoryFetcher = useFetcher<Category>();
    const fetcher = type === "Product" ? productFetcher : categoryFetcher;
    const form = useAppForm({
        defaultValues: (!item.id ? { type } : { ...item, type }) as z.infer<typeof schema>,
        validators: {
            onChangeAsync: onChangeAsync(schema),
            onChangeAsyncDebounceMs: 300,
            onSubmit: schema,
        },
        onSubmit: async (values) => {
            console.log(values);
        },
    });
    const [bState, setBState] = useState<"idle" | "edit" | "save" | "delete">("idle");
    console.log(bState);
    return (
        <form.AppForm>
            <form onSubmit={(e) => e.preventDefault()} className={TableRow({}).props.className}>
                {columns.map((key) => (
                    <form.AppField name={key as keyof (Product | Category)} key={key}>
                        {(field) => (
                            <TableCell className="text-center">
                                <form.Item>
                                    <field.Control>
                                        <Input
                                            type="text"
                                            inputMode="numeric"
                                            value={field.state.value ?? ""}
                                            onChange={(e) => field.handleChange(e.target.value)}
                                            onBlur={field.handleBlur}
                                            className="text-center disabled:opacity-100! border-primary/50 disabled:border-primary/10"
                                            disabled={
                                                disabled.includes(key as keyof (Product | Category)) ||
                                                (!["edit", "save"].includes(bState) && item.id !== undefined)
                                            }
                                        />
                                    </field.Control>
                                    <field.Message />
                                </form.Item>
                            </TableCell>
                        )}
                    </form.AppField>
                ))}
                <TableCell className="text-center items-center justify-center flex">
                    {!item.id ? (
                        <Button className="p-2 mx-1" variant="outline" type="submit">
                            <Plus className="w-7" />
                        </Button>
                    ) : (
                        <>
                            <Button
                                className="p-2 mx-1 relative overflow-hidden group"
                                variant="outline"
                                type="button"
                                onClick={() => {
                                    if (fetcher.state === "idle") {
                                        if (bState === "save") {
                                            form.handleSubmit();
                                        }
                                        setBState((prev) => {
                                            if (prev === "idle") return "edit";
                                            if (prev === "save") return "idle";
                                            return prev;
                                        });
                                    }
                                }}
                            >
                                {["edit", "save"].includes(bState) && (
                                    <ConfirmAnim
                                        className="bg-blue-500"
                                        onConfirm={() => setBState((prev) => (prev === "edit" ? "save" : prev))}
                                        onStart={() => setBState((prev) => (prev === "save" ? "edit" : prev))}
                                    />
                                )}
                                <Pencil
                                    className={
                                        "transition-all " +
                                        (!["edit", "save"].includes(bState)
                                            ? "scale-100 rotate-0"
                                            : "scale-0 -rotate-90")
                                    }
                                />
                                <Check
                                    className={
                                        "transition-all absolute " +
                                        (["edit", "save"].includes(bState) ? "scale-100 rotate-0" : "scale-0 rotate-90")
                                    }
                                />
                            </Button>
                            <Button
                                className="p-2 mx-1 relative overflow-hidden group"
                                variant="outline"
                                type="button"
                                onClick={() => {
                                    if (fetcher.state === "idle" && bState === "delete") {
                                        form.handleSubmit();
                                    }
                                }}
                            >
                                {["idle", "delete"].includes(bState) && (
                                    <ConfirmAnim
                                        className="bg-red-500"
                                        onConfirm={() => {
                                            setBState((prev) => (prev === "idle" ? "delete" : prev));
                                        }}
                                        onStart={() => setBState((prev) => (prev === "delete" ? "idle" : prev))}
                                    />
                                )}
                                <Trash className="w-7 relative z-10" />
                            </Button>
                        </>
                    )}
                </TableCell>
            </form>
        </form.AppForm>
    );
}

function TableGenerator({
    data,
    type,
}:
    | {
          data: Product[];
          type: "Product";
      }
    | {
          data: Category[];
          type: "Category";
      }) {
    type Row = (typeof data)[0];
    const fixed: (keyof Row)[] = ["id", "name", "description", "created_at", "updated_at"];
    const columns: (keyof Row)[] = [
        ...["id", "name", "description"],
        ...(Object.keys(data[0] || {}) as (keyof Row)[]).filter((col) => !["images", ...fixed].includes(col)),
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
                    <RowGenerator type={type} key={item.id} item={item} columns={columns} disabled={disabled} />
                ))}
                <RowGenerator
                    type={type}
                    key="new"
                    item={{
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
