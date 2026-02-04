import { Button } from "@/components/ui/button";
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import type { Route } from "./+types/p.$productId";
import { ShoppingCartIcon } from "lucide-react";
import { fetchProduct } from "@/lib/api";
import { useFetcher, useLocation, type Location } from "react-router";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { LocationState, PageHandle, Product } from "@/types";
import { useCart } from "@/hooks/cart-provider";
import { Img } from "@/components/img-wrapper/img";

export async function clientAction({ params }: Route.ClientActionArgs) {
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate network delay
    return fetchProduct(params.productId);
}

export default function ({ params }: Route.ComponentProps) {
    const productFetcher = useFetcher<Product>();
    const location: Location<LocationState> = useLocation();
    const dollars = Math.floor(productFetcher.data?.price || 0);
    const cents = Math.round(((productFetcher.data?.price || 0) - dollars) * 100)
        .toString()
        .padStart(2, "0");

    useEffect(() => {
        if (location.state?.product?.id === params.productId) {
            productFetcher.reset();
            productFetcher.data = location.state.product;
        }
        if (productFetcher.state === "idle" && productFetcher.data?.id !== params.productId) {
            productFetcher.submit({}, { method: "post" });
        }
        if (productFetcher.data?.id === params.productId) {
            location.state = { ...location.state, product: productFetcher.data };
        }
    }, [location, params.productId, productFetcher]);

    const { addQuantity: addToCart } = useCart();

    const p: Product =
        productFetcher.data?.id === params.productId
            ? productFetcher.data
            : { id: "", name: "", imageUrls: [""], desc: "", price: 0 };

    return (
        <>
            <div className="items-center justify-center flex-1 flex">
                <Card className="p-0 flex-col max-w-7xl h-full w-full gap-0 lg:aspect-4/3 lg:flex-row mx-4">
                    <Carousel className="aspect-3/4 h-full">
                        <CarouselContent className="h-full">
                            {p.imageUrls.map((src, index) => (
                                <CarouselItem key={index}>
                                    <div className="h-full">
                                        <Card className="h-full p-3">
                                            <CardContent className="h-full flex items-center justify-center p-0 overflow-hidden rounded-xl">
                                                <Img
                                                    src={src}
                                                    alt={`Product ${p.id}`}
                                                    className="h-full w-full object-cover pointer-events-none select-none"
                                                />
                                            </CardContent>
                                        </Card>
                                    </div>
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                        {p.imageUrls.length > 1 && (
                            <>
                                <CarouselPrevious className="left-6" size="lg" />
                                <CarouselNext className="right-6" size="lg" />
                            </>
                        )}
                    </Carousel>
                    <div className="p-6 px-3 h-full w-full relative min-h-fit min-w-fit flex flex-col">
                        <CardHeader>
                            <CardTitle className="text-5xl font-bold mb-2">
                                {p.id ? p.name : <Skeleton className="h-9 w-52" />}
                            </CardTitle>
                            <CardDescription className="mb-4">
                                {p.id ? (
                                    p.desc
                                ) : (
                                    <div className="space-y-2">
                                        <Skeleton className="h-6 w-64" />
                                        <Skeleton className="h-6 w-74" />
                                    </div>
                                )}
                            </CardDescription>
                            <CardAction className="px-3 py-1 rounded-full items-stretch inline-block">
                                <span className="text-4xl font-semibold leading-none">
                                    $
                                    {p.id ? `${dollars}` : <Skeleton className="h-10 w-11 inline-block align-bottom" />}
                                </span>
                                <span className="align-top text-xl leading-none">
                                    .{p.id ? cents : <Skeleton className="h-6 w-5 inline-block" />}
                                </span>
                            </CardAction>
                        </CardHeader>
                        <CardFooter className="flex-col gap-2 mt-auto">
                            <Button
                                size="lg"
                                className="w-full mb-2"
                                onClick={() => {
                                    if (p.id) addToCart(p);
                                }}
                            >
                                <ShoppingCartIcon className="mr-2" />
                            </Button>
                        </CardFooter>
                    </div>
                </Card>
            </div>
        </>
    );
}

export const handle: PageHandle = {
    breadcrumb: ({ params, id, pathname }) => ({
        id,
        name: `Product ${params.productId}`,
        pathname,
    }),
};
