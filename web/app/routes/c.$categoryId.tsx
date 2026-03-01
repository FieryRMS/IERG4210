import { PascalCase } from "@/lib/utils";
import type { PageHandle } from "@/types";

import type { Route } from "./+types/c.$categoryId";
import { type UIMatch } from "react-router";
import { Category } from "@/components/category";
import createClient from "openapi-fetch";
import type { paths } from "@/lib/api";

const client = createClient<paths>({ baseUrl: import.meta.env.VITE_API_URL });
export function meta({ matches }: Route.MetaArgs) {
    const breadcrumbs = (matches as UIMatch<unknown, PageHandle>[])
        .filter((match) => match.handle && match.handle.breadcrumb)
        .map((match) => match.handle!.breadcrumb!(match));
    const name = breadcrumbs.length ? breadcrumbs.at(-1)!.name : null;
    return [
        { title: `${name ? `${name} | ` : ""}The Generic Company` },
        { name: "description", content: "A generic company that sells generic products" },
    ];
}

export async function loader({ params }: Route.LoaderArgs) {
    if (Number.isInteger(parseInt(params.categoryId))) {
        const { data, error } = await client.GET(`/products/category/{category_id}`, {
            params: {
                path: {
                    category_id: parseInt(params.categoryId),
                },
            },
        });
        if (error) {
            throw new Response("Not Found", { status: 404 });
        }
        return data;
    } else {
        const { data, error } = await client.GET(`/products/`);
        if (error) {
            throw new Response("Not Found", { status: 404 });
        }
        return data;
    }
}

export default function MainPage({ loaderData }: Route.ComponentProps) {
    return <Category products={loaderData} />;
}

export const handle: PageHandle = {
    breadcrumb: ({ params, id, pathname }) => ({
        id,
        name: params.categoryId ? PascalCase(params.categoryId.replace(/[^a-zA-Z0-9]+/g, " ")) : "Unknown Category",
        pathname,
    }),
};
