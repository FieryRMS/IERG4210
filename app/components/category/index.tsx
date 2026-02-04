import type { Product } from "@/types";
import { ProductCard } from "./product-card";

export function Category({ products }: { products: Product[] }) {
    return (
        <div className="w-full flex flex-wrap gap-4 justify-center h-full">
            {products.map((p, _) => (
                <ProductCard key={_} product={p} />
            ))}
        </div>
    );
}
