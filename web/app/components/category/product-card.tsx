import { ShoppingCartIcon } from "lucide-react";
import { Card, CardAction, CardHeader, CardTitle } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/components/link-wrapper";
import type { Product } from"@/lib/generated/types.gen";
import { useCart } from "@/hooks/cart-provider";
import { Img } from "@/components/img-wrapper";
import { Skeleton } from "../ui/skeleton";

export function ProductCard({ product }: { product: Product }) {
    const dollars = Math.floor(product.price);
    const cents = Math.round((product.price - dollars) * 100)
        .toString()
        .padStart(2, "0");
    const { addQuantity: addToCart } = useCart();
    return (
        <Card className="w-full max-w-sm p-0 relative overflow-hidden flex max-h-fit">
            <Link to={`/p/${product.id}`} viewTransition style={product.id ? {} : { pointerEvents: "none" }}>
                <AspectRatio ratio={3 / 4}>
                    <Img
                        src={`${product?.images?.[0]?.url}?thumbnail=true`}
                        alt={product?.images?.[0]?.alt ?? product.name}
                        className="w-full h-full object-cover pointer-events-none select-none"
                        draggable={false}
                    />
                </AspectRatio>
                <CardHeader className="absolute w-full bottom-2 p-3">
                    <CardTitle className="row-start-2 text-2xl">
                        {product.id ? (
                            product.name
                        ) : (
                            <Skeleton className="w-3/4 h-8 mb-2 dark:bg-white/10 not-dark:bg-black/10" />
                        )}
                    </CardTitle>
                    <CardAction className="">
                        <Badge
                            variant="secondary"
                            className="px-3 py-1 rounded-full items-stretch inline-block bg-background/85 shadow-sm backdrop-blur"
                        >
                            <span className="text-4xl font-semibold leading-none">
                                ${product.id ? dollars : <Skeleton className="h-10 w-11 inline-block align-bottom" />}
                            </span>
                            <span className="align-top text-xl leading-none">
                                .{product.id ? cents : <Skeleton className="h-6 w-5 inline-block" />}
                            </span>
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
