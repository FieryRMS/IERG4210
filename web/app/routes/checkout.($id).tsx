import type { Route } from "./+types/checkout.($id)";
import type { Order, OrderWithProducts } from "@/lib/generated/types.gen";
import type { PageHandle } from "@/types";
import { redirect, useNavigate } from "react-router";
import { useState } from "react";
import { sdk, applyAuth, forward } from "@/lib/server.utils";
import { ServerException } from "@/lib/errors";
import { UserContext } from "@/context.server";
import { useCart, type CartProviderState } from "@/hooks/cart-provider";
import { useAuth } from "@/hooks/auth-provider";
import { zOrderCreate } from "@/lib/generated/zod.gen";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
    const auth = await applyAuth(request);
    return forward(() => sdk.orders.getOrdersMeById({ ...auth, path: { id } }));
}

export default function CheckoutPage({ loaderData }: Route.ComponentProps) {
    if (loaderData) return <OrderView order={loaderData} />;
    return <CartView />;
}

function OrderView({ order }: { order: OrderWithProducts }) {
    const navigate = useNavigate();
    const productmap = new Map(order.products.map((p) => [p.id, p]));
    const cart: CartProviderState["cart"] = {
        ray_id: order.order.ray_id!,
        products: Object.fromEntries(
            order.order.products.map((p) => {
                return [p.id, { p: productmap.get(p.id)!, q: p.count }];
            }),
        ),
    };
    return (
        <div className="container mx-auto max-w-2xl px-4 py-10">
            <Card>
                <CardHeader>
                    <div className="flex gap-2">
                        <CardTitle className="flex items-center justify-center">Order ID: {order.order.id}</CardTitle>
                        {order.order.paid ? (
                            <Badge variant="secondary" className="bg-blue-500 text-white dark:bg-blue-600">
                                Paid
                            </Badge>
                        ) : (
                            <Badge variant="destructive">Unpaid</Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <CartContents
                        variantItemMedia="default"
                        cart={cart}
                        clearCart={() => {
                            fetch(`/api/order/${order.order.id}`, { method: "DELETE" })
                                .then((res) => {
                                    if (res.ok) {
                                        toast.success("Order cancelled");
                                        navigate("/me");
                                    } else {
                                        console.error("Failed to cancel order", res);
                                        return res.json();
                                    }
                                })
                                .then((data) => {
                                    if (data?.detail) {
                                        const error = ServerException.fromJson(data);
                                        toast.error(`Failed to cancel order: ${error.message}`);
                                    }
                                })
                                .catch(() => {
                                    toast.error("Failed to cancel order");
                                });
                        }}
                    />
                </CardContent>
                <CardFooter>
                    <Button className="w-full" disabled={!cart || Object.keys(cart.products).length === 0}>
                        Pay Now
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

function CartView() {
    const { cart, setQuantity, clearCart } = useCart();
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
                toast.error(`Failed to place order: ${error.message}`);
                return;
            }
            const order: Order = await response.json();
            clearCart();
            toast.success("Order placed! Redirecting...");
            navigate(`/checkout/${order.id}`);
        } catch {
            toast.error("Failed to place order");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="container mx-auto max-w-2xl px-4 py-10">
            <Card>
                <CardHeader>
                    <CardTitle>Your Cart</CardTitle>
                </CardHeader>
                <CardContent>
                    <CartContents
                        variantItemMedia="default"
                        cart={cart}
                        setQuantity={setQuantity}
                        clearCart={clearCart}
                    />
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
        </div>
    );
}
