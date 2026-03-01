import { PascalCase } from "@/lib/utils";
import type { PageHandle, Product } from "@/types";
import { useEffect } from "react";

import type { Route } from "./+types/c.$categoryId";
import { fetchProducts } from "@/lib/api";
import { useFetcher, type UIMatch } from "react-router";
import { Category } from "@/components/category";


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


export async function clientAction(): Promise<Product[]> {
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate network delay
    return await fetchProducts(0, 30);
}

export async function loader({ params }: Route.LoaderArgs) {
};

export default function MainPage() {
    const productsFetcher = useFetcher<Product[]>();
    useEffect(() => {
        if (productsFetcher.state === "idle" && !productsFetcher.data) {
            productsFetcher.submit({}, { method: "post" });
        }
    }, [productsFetcher]);

    const products: Product[] =
        productsFetcher.data ||
        Array(10).fill({
            id: "",
            name: "",
            imageUrls: [""],
            desc: "",
            price: 0,
        });

    return <Category products={products} />;
}


export const handle: PageHandle = {
    breadcrumb: ({ params, id, pathname }) => ({
        id,
        name: params.categoryId ? PascalCase(params.categoryId.replace(/[^a-zA-Z0-9]+/g, " ")) : "Unknown Category",
        pathname,
    }),
};
