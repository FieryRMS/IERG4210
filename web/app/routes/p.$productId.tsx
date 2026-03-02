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
import { Skeleton } from "@/components/ui/skeleton";
import type { PageHandle, Product } from "@/types";
import { useCart } from "@/hooks/cart-provider";
import { Img } from "@/components/img-wrapper";
import type { paths } from "@/lib/api";
import createClient from "openapi-fetch";

export async function loader({ params }: Route.LoaderArgs) {
    const client = createClient<paths>({ baseUrl: process.env.API_URL });
    if (Number.isInteger(parseInt(params.productId))) {
        const { data, error } = await client.GET(`/products/{product_id}`, {
            params: {
                path: {
                    product_id: parseInt(params.productId),
                },
            },
        });
        if (error) {
            throw new Response("Not Found", { status: 404 });
        }
        return data;
    }
    throw new Response("Not Found", { status: 404 });
}

export default function ({ params, loaderData }: Route.ComponentProps) {
    const dollars = Math.floor(loaderData?.price || 0);
    const cents = Math.round(((loaderData?.price || 0) - dollars) * 100)
        .toString()
        .padStart(2, "0");
    const pid = parseInt(params.productId);

    const { addQuantity: addToCart } = useCart();

    const p: Product =
        loaderData?.id === pid
            ? loaderData
            : { id: 0, name: "", images: [""], description: "", price: 0, catid: 0, created_at: "", updated_at: "" };

    return (
        <>
            <div className="flex items-center justify-center h-full">
                <Card className="p-0 flex-col max-w-3xl lg:max-w-7xl w-full gap-0 lg:aspect-4/3 lg:flex-row mx-4">
                    <Carousel className="aspect-3/4 h-full">
                        <CarouselContent className="h-full">
                            {p.images?.map((src, index) => (
                                <CarouselItem key={index}>
                                    <div className="h-full">
                                        <Card className="h-full p-3">
                                            <CardContent className="h-full flex items-center justify-center p-0 overflow-hidden rounded-xl">
                                                <Img
                                                    src={src}
                                                    alt={p.description || p.name}
                                                    className="h-full w-full object-cover pointer-events-none select-none"
                                                />
                                            </CardContent>
                                        </Card>
                                    </div>
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                        {p.images && p.images.length > 1 && (
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
                                    p.description
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
