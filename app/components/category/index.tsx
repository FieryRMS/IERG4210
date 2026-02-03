import type { Product } from "@/types";
import { ProductCard } from "./product-card";

export function Category({ products }: { products: Product[] }) {
    return (
        <div className="w-full flex flex-wrap gap-4 items-center justify-center">
            {products.map((p) => (
                <ProductCard key={p.id} product={p} />
            ))}
        </div>
    );
}
