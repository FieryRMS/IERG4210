import { getClient } from "@/lib/utils";
import type { PageHandle } from "@/types";

import type { Route } from "./+types/c.$categoryId";
import { Category } from "@/components/category";
import { StatusCodes } from "http-status-codes";

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
    console.log(params);
    const client = getClient();
    if (params.categoryId) {
        const { data: pdata, error: perror } = await client.GET(`/products/category/{category_id}`, {
            params: {
                path: {
                    category_id: params.categoryId,
                },
            },
        });
        const { data: cdata, error: cerror } = await client.GET(`/categories/{category_id}`, {
            params: {
                path: {
                    category_id: params.categoryId,
                },
            },
        });
        if (cerror || perror) {
            throw new Response("Not Found", { status: StatusCodes.NOT_FOUND });
        }
        return { products: pdata, category: cdata };
    } else {
        const { data, error } = await client.GET(`/products/`);
        if (error) {
            throw new Response("Not Found", { status: StatusCodes.NOT_FOUND });
        }
        return { products: data, category: null };
    }
}

export default function MainPage({ loaderData }: Route.ComponentProps) {
    return <Category products={loaderData.products} />;
}

export const handle: PageHandle<Route.ComponentProps["loaderData"]> = {
    breadcrumb: ({ pathname, loaderData }) => ({
        pathname,
        name: loaderData?.category?.name || "Home",
    }),
};
