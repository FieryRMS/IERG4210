import type { Route } from "./+types/_index";
import { Category } from "@/components/category";
import { fetchProducts } from "@/lib/api";
import type { PageHandle, Product } from "@/types";
import type { UIMatch } from "react-router";

export function meta({ matches }: Route.MetaArgs) {
    const breadcrumbs = (matches as UIMatch<unknown, PageHandle>[])
        .filter((match) => match.handle && match.handle.breadcrumb)
        .map((match) => match.handle!.breadcrumb!(match));
    const name = breadcrumbs.length ? breadcrumbs.at(-1)!.name : null;
    console.log(breadcrumbs);
    return [
        { title: `${name ? `${name} | ` : ""}The Generic Company` },
        { name: "description", content: "A generic company that sells generic products" },
    ];
}

export async function clientLoader(): Promise<Product[]> {
    return await fetchProducts(0, 100);
}

export default function MainPage({ loaderData }: Route.ComponentProps) {
    return (
        <>
            <Category products={loaderData} />
        </>
    );
}

export const handle: PageHandle = {
    breadcrumb: ({ params, id, pathname }) => ({
        id,
        name: `Category ${params.categoryId}`,
        pathname,
    }),
};
