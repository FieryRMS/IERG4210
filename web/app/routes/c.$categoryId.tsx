import { getClient, PascalCase } from "@/lib/utils";
import type { PageHandle } from "@/types";

import type { Route } from "./+types/c.$categoryId";
import { Category } from "@/components/category";

export function meta({ loaderData }: Route.MetaArgs) {
    return [
        { title: `${loaderData.category?.name ? `${loaderData.category.name}` : "Home"} | The Generic Company` },
        {
            name: "description",
            content: loaderData.category?.description ?? "Generic Product from a Generic Company",
        },
    ];
}

export async function loader({ params }: Route.LoaderArgs) {
    const client = getClient();
    if (Number.isInteger(parseInt(params.categoryId))) {
        const { data: pdata, error: perror } = await client.GET(`/products/category/{category_id}`, {
            params: {
                path: {
                    category_id: parseInt(params.categoryId),
                },
            },
        });
        const { data: cdata, error: cerror } = await client.GET(`/categories/{category_id}`, {
            params: {
                path: {
                    category_id: parseInt(params.categoryId),
                },
            },
        });
        if (cerror || perror) {
            throw new Response("Not Found", { status: 404 });
        }
        return { products: pdata, category: cdata };
    } else {
        const { data, error } = await client.GET(`/products/`);
        if (error) {
            throw new Response("Not Found", { status: 404 });
        }
        return { products: data, category: null };
    }
}

export default function MainPage({ loaderData }: Route.ComponentProps) {
    return <Category products={loaderData.products} />;
}

export const handle: PageHandle = {
    breadcrumb: ({ params, id, pathname }) => ({
        id,
        name: params.categoryId ? PascalCase(params.categoryId.replace(/[^a-zA-Z0-9]+/g, " ")) : "Unknown Category",
        pathname,
    }),
};
