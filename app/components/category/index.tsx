import { ProductCard } from "./product-card";

export function Category() {
    // Generate 10 random products
    const products = Array.from({ length: 100 }, (_, i) => ({
        id: i.toString(),
        name: `Product ${i}`,
        imageUrl: `https://avatar.vercel.sh/shadcn${i}`,
        price: Math.round((Math.random() * 100 + 1) * 100) / 100, // $1.00 - $100.00
    }));

    return (
        <div className="w-full flex flex-wrap gap-4 items-center justify-center">
            {products.map((p) => (
                <ProductCard key={p.id} {...p} />
            ))}
        </div>
    );
}
