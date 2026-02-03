import type { Product } from "@/types";

export async function fetchProduct(productId: Product["id"]): Promise<Product> {
    return {
        id: productId,
        name: `Product ${productId}`,
        imageUrl: `https://avatar.vercel.sh/shadcn${productId}`,
        desc: "Why did the price change? such an unstable market, damn",
        price: Math.round((Math.random() * 100 + 1) * 100) / 100, // $1.00 - $100.00
    };
}

export async function fetchProducts(page: number, limit: number): Promise<Product[]> {
    return Promise.all(Array.from({ length: limit }, (_, i) => fetchProduct((page * limit + i).toString())));
}
