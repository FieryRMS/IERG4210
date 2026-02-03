import { ShoppingCartIcon } from "lucide-react";
import { Card, CardAction, CardHeader, CardTitle } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import { Badge } from "../ui/badge";
import { Link } from "@/components/link-wrapper";
import type { Product } from "@/types";
import { useCart } from "@/hooks/cart-provider";

export function ProductCard({ product }: { product: Product }) {
    const dollars = Math.floor(product.price);
    const cents = Math.round((product.price - dollars) * 100)
        .toString()
        .padStart(2, "0");
    const { addToCart } = useCart();

    return (
        <Card className="w-full max-w-sm p-0 relative overflow-hidden">
            <Link
                to={`/p/${product.id}`}
                className="block w-full h-full"
                viewTransition
                state={{
                    product,
                }}
            >
                <AspectRatio ratio={3 / 4}>
                    <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover pointer-events-none select-none"
                        draggable={false}
                    />
                </AspectRatio>
                <CardHeader className="absolute w-full bottom-2 p-3">
                    <CardTitle className="row-start-2 text-2xl">{product.name}</CardTitle>
                    <CardAction className="">
                        <Badge
                            variant="secondary"
                            className="px-3 py-1 rounded-full items-stretch inline-block bg-background/85 shadow-sm backdrop-blur"
                        >
                            <span className="text-4xl font-semibold leading-none">${dollars}</span>
                            <span className="align-top text-xl leading-none">.{cents}</span>
                        </Badge>
                    </CardAction>
                </CardHeader>
            </Link>
            <Button
                size="icon-lg"
                className="rounded-full absolute top-2 right-2"
                variant="secondary"
                onClick={() => addToCart(product)}
            >
                <ShoppingCartIcon />
            </Button>
        </Card>
    );
}
