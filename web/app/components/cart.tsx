"use client";

import { MinusIcon, PlusIcon, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Img } from "@/components/img-wrapper";
import { useCart } from "@/hooks/cart-provider";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Spinner } from "./ui/spinner";

export function CartContents({
    children,
    variantItemMedia,
}: {
    children?: React.ReactNode;
    variantItemMedia?: Parameters<typeof ItemMedia>[0]["variant"];
}) {
    const { cart, addQuantity, removeQuantity, setQuantity, clearCart } = useCart();

    if (!cart || Object.keys(cart.products).length === 0) {
        return (
            <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
                {cart === null ? (
                    <Spinner className="size-10" />
                ) : (
                    <>
                        <ShoppingCart className="size-10 opacity-30" />
                        <p className="text-sm">No items in cart.</p>
                    </>
                )}
            </div>
        );
    }

    const items = Object.values(cart.products);
    const total = items.reduce((sum, { p, q }) => sum + p.price * q, 0);
    return (
        <div className="flex flex-col gap-3">
            <ItemGroup className="gap-2">
                {items.map(({ p, q }) => (
                    <Item key={p.id} variant="outline" role="listitem">
                        <ItemMedia variant={variantItemMedia} className="self-center! translate-y-0!">
                            <Img
                                src={p.images?.[0]?.url}
                                alt={p.name}
                                className="w-full h-full object-cover pointer-events-none select-none"
                            />
                        </ItemMedia>
                        <ItemContent className="self-center">
                            <ItemTitle className="line-clamp-1">{p.name}</ItemTitle>
                            <ItemDescription>HKD {p.price.toFixed(2)}</ItemDescription>
                        </ItemContent>
                        <ItemContent className="flex-none self-center text-center gap-1">
                            <ButtonGroup>
                                <Button variant="outline" aria-label="decrease" onClick={() => removeQuantity(p)}>
                                    <MinusIcon />
                                </Button>
                                <Input
                                    className="w-12 text-center"
                                    value={q}
                                    key={q}
                                    min={0}
                                    max={100}
                                    onBlur={(e) => {
                                        const v = parseInt(e.target.value, 10);
                                        setQuantity(p, isNaN(v) ? q : v);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") e.currentTarget.blur();
                                    }}
                                />
                                <Button variant="outline" aria-label="increase" onClick={() => addQuantity(p)}>
                                    <PlusIcon />
                                </Button>
                            </ButtonGroup>
                            <p className="text-sm font-medium text-center">HKD {(p.price * q).toFixed(2)}</p>
                        </ItemContent>
                    </Item>
                ))}
            </ItemGroup>
            <Separator />
            <div className="flex items-center justify-between text-sm font-semibold px-1">
                <span>Total</span>
                <div className="flex items-center gap-3">
                    <span>HKD {total.toFixed(2)}</span>
                    <AlertDialog>
                        <AlertDialogTrigger
                            render={
                                <Button variant="outline" className=" text-muted-foreground hover:text-destructive" />
                            }
                        >
                            <Trash2 />
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Clear cart?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will remove all items from your cart.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={clearCart}
                                >
                                    Clear
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>
            {children}
        </div>
    );
}
