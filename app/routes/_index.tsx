import type { Route } from "./+types/_index";
import { Category } from "@/components/category";
import { fetchProducts } from "@/lib/api";
import type { PageHandle, Product } from "@/types";
import { useEffect } from "react";
import { useFetcher, type UIMatch } from "react-router";

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
