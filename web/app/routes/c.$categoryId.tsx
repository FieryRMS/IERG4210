import type { PageHandle } from "@/types";
import type { Route } from "./+types/c.$categoryId";
import { Category } from "@/components/category";
import { sdk } from "@/lib/utils";
import { getAuth } from "@/lib/server.utils";
import { ServerNotFoundException } from "@/lib/errors";

export function meta({ loaderData }: Route.MetaArgs) {
    return [
        { title: `${loaderData.category?.name ? `${loaderData.category.name}` : "Home"} | The Generic Company` },
        {
            name: "description",
            content: loaderData.category?.description ?? "Generic Product from a Generic Company",
        },
    ];
}

export async function loader({ params, request }: Route.LoaderArgs) {
    const auth = await getAuth(request);
    if (params.categoryId) {
        const { data: products, error: perror } = await sdk.products.getProductsCategoryByCategoryId({
            path: { category_id: params.categoryId },
            ...auth,
        });
        const { data: category, error: cerror } = await sdk.categories.getCategoriesByCategoryId({
            path: { category_id: params.categoryId },
            ...auth,
        });
        if (cerror || perror) {
            throw new ServerNotFoundException();
        }
        return { products, category };
    } else {
        const { data: products, error } = await sdk.products.getProducts(auth);
        if (error) {
            throw new ServerNotFoundException();
        }
        return { products: products ?? [], category: null };
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
