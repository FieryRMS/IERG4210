import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { paths } from "@/lib/api";
import createClient from "openapi-fetch";
import type { Route } from "./+types/admin";
import { Pencil, Trash } from "lucide-react";

const client = createClient<paths>({ baseUrl: import.meta.env.VITE_API_URL });

export async function action({ request }: { request: Request; }) {
    const formData = await request.formData();
    const actionType = formData.get("action");
    const id = formData.get("id") as string;
    const entity = formData.get("entity") as string;
    if (actionType === "delete") {
        if (entity === "product") {
            await client.DELETE("/products/{product_id}", { params: { path: { product_id: parseInt(id) } } });
        } else if (entity === "category") {
            await client.DELETE("/categories/{category_id}", { params: { path: { category_id: parseInt(id) } } });
        }
    } else if (actionType === "edit") {
        // Collect all fields from the form
        const data: Record<string, any> = {};
        for (const [key, value] of formData.entries()) {
            if (["id", "entity", "action"].includes(key)) continue;
            // Try to parse JSON for arrays
            try {
                data[key] = JSON.parse(value as string);
            } catch {
                data[key] = value;
            }
        }
        if (entity === "product") {
            await client.PUT("/products/{product_id}", {
                params: { path: { product_id: parseInt(id) } },
                body: data,
            });
        } else if (entity === "category") {
            await client.PUT("/categories/{category_id}", {
                params: { path: { category_id: parseInt(id) } },
                body: data,
            });
        }
    }
    return null;
}

function TableGenerator({
    data,
    columns,
}: {
    data: any[];
    columns: string[];
}) {
    return (
        <Table>
            <TableCaption>A list of your recent invoices.</TableCaption>
            <TableHeader>
                <TableRow>
                    {columns?.map((col) => (
                        <TableHead key={col}>{col}</TableHead>
                    ))}
                    <TableHead>Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.map((row, index) => (
                    <TableRow key={index}>
                        {columns?.map((col) => (
                            <TableCell key={col}>{row[col]}</TableCell>
                        ))}
                        <TableCell>
                            <form method="post" style={{ display: "inline" }}>
                                <input type="hidden" name="id" value={row.id} />
                                <input type="hidden" name="entity" value={row.catid ? "product" : "category"} />
                                <input type="hidden" name="action" value="edit" />
                                {columns.map((col) => (
                                    <input
                                        key={col}
                                        type="hidden"
                                        name={col}
                                        value={Array.isArray(row[col]) ? JSON.stringify(row[col]) : row[col] ?? ""}
                                    />
                                ))}
                                <button
                                    type="submit"
                                    style={{ marginRight: "8px" }}
                                    className="px-2 py-1 bg-blue-500 text-white rounded"
                                >
                                    <Pencil size={16} />
                                </button>
                            </form>
                            <form method="post" style={{ display: "inline" }}>
                                <input type="hidden" name="id" value={row.id} />
                                <input type="hidden" name="entity" value={row.catid ? "product" : "category"} />
                                <input type="hidden" name="action" value="delete" />
                                <button
                                    type="submit"
                                    className="px-2 py-1 bg-red-500 text-white rounded"
                                >
                                    <Trash size={16} />
                                </button>
                            </form>
                        </TableCell>
                    </TableRow>
                ))}
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
                    <TableGenerator
                        data={loaderData.products}
                        columns={Object.keys(loaderData.products[0] || {}).filter((col) => col !== "images")}
                    />
                </div>
                <div className="p-4 rounded shadow">
                    <h2 className="text-xl font-semibold mb-2">Categories</h2>
                    <TableGenerator
                        data={loaderData.categories}
                        columns={Object.keys(loaderData.categories[0] || {})}
                    />
                </div>
            </div>
        </div>
    );
}
