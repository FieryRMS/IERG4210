import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { paths } from "@/lib/api";
import createClient from "openapi-fetch";
import type { Route } from "./+types/admin";
import { Pencil, Trash } from "lucide-react";
import type { Product, Category } from "@/types";
import { z } from "zod";
import { useAppForm } from "@/components/ui/form-tanstack";
import { Input } from "@/components/ui/input";
import { onChangeAsync } from "@/lib/utils";

const client = createClient<paths>({ baseUrl: import.meta.env.VITE_API_URL });

export async function action({ request }: { request: Request }) {}

const baseSchema = z.object({
    id: z.coerce.number<number>(),
    name: z.string(),
    description: z.string().nullable(),
    created_at: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{6}$/, "Invalid date format"),
    updated_at: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{6}$/, "Invalid date format"),
});
const productSchema = baseSchema.extend({
    price: z.coerce.number<number>(),
    catid: z.coerce.number<number>(),
});

const categorySchema = baseSchema.extend({
    images: z.string().array().nullable(),
});

const schema = z.discriminatedUnion("type", [
    productSchema.extend({ type: z.literal("Product") }),
    categorySchema.extend({ type: z.literal("Category") }),
]);

function RowGenerator({
    type,
    item,
    columns,
    disabled,
}:
    | { type: "Product"; item: Product; columns: (keyof Product)[]; disabled: (keyof Product)[] }
    | { type: "Category"; item: Category; columns: (keyof Category)[]; disabled: (keyof Category)[] }) {
    const form = useAppForm({
        defaultValues: { ...item, type } as z.infer<typeof schema>,
        validators: {
            onChangeAsync: onChangeAsync(schema),
            onChangeAsyncDebounceMs: 300,
            onSubmit: schema,
        },
        onSubmit: async (values) => {
            console.log(values);
        },
    });
    return (
        <form.AppForm>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    form.handleSubmit();
                }}
                className={TableRow({}).props.className}
            >
                {columns.map((key) => (
                    <form.AppField name={key as keyof (Product | Category)} key={key}>
                        {(field) => (
                            <TableCell className="text-center">
                                <form.Item>
                                    <field.Control>
                                        <Input
                                            type={key === "price" ? "number" : "text"}
                                            value={field.state.value || ""}
                                            onChange={(e) => field.handleChange(e.target.value)}
                                            onBlur={field.handleBlur}
                                            className="text-center disabled:opacity-100! border-primary/50 disabled:border-primary/10"
                                            disabled={disabled.includes(key as keyof (Product | Category))}
                                        />
                                    </field.Control>
                                    <field.Message />
                                </form.Item>
                            </TableCell>
                        )}
                    </form.AppField>
                ))}
                <TableCell className="text-center">
                    <button className="p-2 rounded hover:bg-muted">
                        <Pencil className="w-7" />
                    </button>
                    <button className="p-2 rounded hover:bg-muted">
                        <Trash className="w-7" />
                    </button>
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
        <Table>
            <TableCaption>{type} CRUD table</TableCaption>
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
                {type === "Product" ? (
                    <>
                        {(data as Product[]).map((item) => (
                            <RowGenerator
                                type="Product"
                                key={item.id}
                                item={item} // item is Product
                                columns={columns as (keyof Product)[]}
                                disabled={disabled}
                            />
                        ))}
                    </>
                ) : (
                    <>
                        {(data as Category[]).map((item) => (
                            <RowGenerator
                                type="Category"
                                key={item.id}
                                item={item} // item is Category
                                columns={columns as (keyof Category)[]}
                                disabled={disabled}
                            />
                        ))}
                    </>
                )}
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
