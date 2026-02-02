import { ShoppingCartIcon } from "lucide-react";
import { Card, CardAction, CardHeader, CardTitle } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import { Badge } from "../ui/badge";
import { Link } from "react-router";

export function ProductCard({
    id,
    name,
    imageUrl,
    price,
}: {
    id: string;
    name: string;
    imageUrl: string;
    price: number;
}) {
    const dollars = Math.floor(price);
    const cents = Math.round((price - dollars) * 100)
        .toString()
        .padStart(2, "0");

    return (
        <Card className="w-full max-w-sm p-0 relative overflow-hidden">
            <Link to={`/p/${id}`} className="block w-full h-full">
                <AspectRatio ratio={3 / 4}>
                    <img
                        src={imageUrl}
                        alt={name}
                        className="w-full h-full object-cover pointer-events-none select-none"
                        draggable={false}
                    />
                </AspectRatio>
                <CardHeader className="absolute w-full bottom-2 p-3">
                    <CardTitle className="row-start-2 text-2xl">{name}</CardTitle>
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
            <Button size="icon-lg" className="rounded-full absolute top-2 right-2" variant="secondary">
                <ShoppingCartIcon />
            </Button>
        </Card>
    );
}
