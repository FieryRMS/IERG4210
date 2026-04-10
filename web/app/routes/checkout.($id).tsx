import type { Route } from "./+types/checkout.($id)";
import type { Order } from "@/lib/generated/types.gen";
import type { PageHandle } from "@/types";
import { redirect, useNavigate } from "react-router";
import { useState } from "react";
import { sdk, applyAuth } from "@/lib/server.utils";
import { ServerException, ServerNotFoundException } from "@/lib/errors";
import { UserContext } from "@/context.server";
import { useCart } from "@/hooks/cart-provider";
import { useAuth } from "@/hooks/auth-provider";
import { zOrderCreate } from "@/lib/generated/zod.gen";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { CartContents } from "@/components/cart";
import { toast } from "sonner";

export const handle: PageHandle<Route.ComponentProps["loaderData"]> = {
    breadcrumb: () => ({ pathname: "/checkout", name: "Checkout" }),
};

export function meta() {
    return [{ title: "Checkout | The Generic Company" }];
}

export async function loader({ params, request, context }: Route.LoaderArgs) {
    const { id } = params;
    if (!id) return null;
    const user = context.get(UserContext);
    if (!user) throw redirect("/");
    const { data, error } = await sdk.orders.getOrdersMeById({ ...(await applyAuth(request)), path: { id } });
    if (error || !data) throw new ServerNotFoundException();
    return data;
}

export default function CheckoutPage({ loaderData }: Route.ComponentProps) {
    if (loaderData) return <OrderView order={loaderData} />;
    return <CartView />;
}

function OrderView({ order }: { order: Order }) {
    return (
        <main className="container mx-auto max-w-2xl px-4 py-10">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                        <CardTitle>Order Summary</CardTitle>
                        <div className="flex gap-2">
                            {order.paid ? <Badge>Paid</Badge> : <Badge variant="outline">Unpaid</Badge>}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    {order.products.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 text-sm">
                            <p className="flex-1 font-mono text-muted-foreground truncate">{item.id}</p>
                            <p className="text-muted-foreground shrink-0">× {item.count}</p>
                            <p className="w-28 text-right font-medium shrink-0">
                                HKD {(item.price * item.count).toFixed(2)}
                            </p>
                        </div>
                    ))}
                    <Separator />
                    <div className="flex justify-between font-semibold">
                        <span>Total</span>
                        <span>HKD {order.price.toFixed(2)}</span>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button className="w-full" disabled>
                        Pay Now
                    </Button>
                </CardFooter>
            </Card>
        </main>
    );
}

function CartView() {
    const { cart, clearCart } = useCart();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);

    async function handleCheckout(c: NonNullable<typeof cart>) {
        if (!user?.id) {
            toast.error("You must be logged in to checkout");
            return;
        }
        setSubmitting(true);
        try {
            const body = zOrderCreate.parse({
                user_id: user.id,
                ray_id: c.ray_id,
                products: Object.values(c.products).map(({ p, q }) => ({ id: p.id, price: p.price, count: q })),
            });
            const response = await fetch("/api/order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (!response.ok) {
                const error = ServerException.fromJson(await response.json().catch(() => null));
                toast.error(`Failed to place order: ${error.detail}`);
                return;
            }
            const order: Order = await response.json();
            clearCart();
            toast.success("Order placed!");
            navigate(`/checkout/${order.id}`);
        } catch {
            toast.error("Failed to place order");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <main className="container mx-auto max-w-2xl px-4 py-10">
            <Card>
                <CardHeader>
                    <CardTitle>Your Cart</CardTitle>
                </CardHeader>
                <CardContent>
                    <CartContents variantItemMedia="default" />
                </CardContent>
                <CardFooter>
                    <Button
                        className="w-full"
                        onClick={() => cart && handleCheckout(cart)}
                        disabled={submitting || !cart || Object.keys(cart.products).length === 0}
                    >
                        {submitting ? <Spinner /> : "Checkout"}
                    </Button>
                </CardFooter>
            </Card>
        </main>
    );
}
