import { HomeIcon } from "lucide-react";
import type { Route } from "./+types/_index";
import { Category } from "@/components/category";
import { fetchProducts } from "@/lib/api";
import type { Product } from "@/types";

export function meta({}: Route.MetaArgs) {
    return [
        { title: "The Generic Company" },
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
