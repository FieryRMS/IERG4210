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

export async function loader({ params }: Route.LoaderArgs) {
    return {
        id: params.productId,
        name: "Product " + params.productId,
        imageUrl: `https://avatar.vercel.sh/shadcn${params.productId}`,
        desc: "Why did the price change? such an unstable market, damn",
        price: Math.round((Math.random() * 100 + 1) * 100) / 100, // $1.00 - $100.00
    };
}

export default function ({ loaderData }: Route.ComponentProps) {
    const dollars = Math.floor(loaderData.price);
    const cents = Math.round((loaderData.price - dollars) * 100)
        .toString()
        .padStart(2, "0");
    return (
        <>
            <div className="items-center justify-center flex-1 flex">
                <Card className="p-0 flex-col max-w-7xl h-full w-full gap-0 lg:aspect-4/3 lg:flex-row mx-4">
                    <Carousel className="aspect-3/4 h-full">
                        <CarouselContent className="h-full">
                            {Array.from({ length: 5 }).map((_, index) => (
                                <CarouselItem key={index}>
                                    <div className="h-full">
                                        <Card className="h-full">
                                            <CardContent className="h-full flex items-center justify-center">
                                                <img
                                                    src={`https://avatar.vercel.sh/shadcn${loaderData.id}${index}`}
                                                    alt={`Product ${loaderData.id}`}
                                                    className="h-full w-full object-cover pointer-events-none select-none"
                                                />
                                            </CardContent>
                                        </Card>
                                    </div>
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                        <CarouselPrevious className="left-6" size="lg" />
                        <CarouselNext className="right-6" size="lg" />
                    </Carousel>
                    <div className="p-6 px-3 h-full w-full relative min-h-fit min-w-fit flex flex-col">
                        <CardHeader>
                            <CardTitle className="text-5xl font-bold mb-2">{loaderData.name}</CardTitle>
                            <CardDescription className="mb-4">{loaderData.desc}</CardDescription>
                            <CardAction className="px-3 py-1 rounded-full items-stretch inline-block">
                                <span className="text-4xl font-semibold leading-none">${dollars}</span>
                                <span className="align-top text-xl leading-none">.{cents}</span>
                            </CardAction>
                        </CardHeader>
                        <CardFooter className="flex-col gap-2 mt-auto">
                            <Button size="lg" className="w-full mb-2">
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
    breadcrumb: ({ params }: Route.ComponentProps) => params.productId,
};
