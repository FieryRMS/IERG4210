import type { Route } from "./+types/checkout.($id)";
import type { Order, OrderWithProducts } from "@/lib/generated/types.gen";
import type { PageHandle } from "@/types";
import { redirect, useNavigate } from "react-router";
import { useState } from "react";
import { sdk, applyAuth, forward } from "@/lib/server.utils";
import { ServerException } from "@/lib/errors";
import { UserContext } from "@/lib/security.server";
import { useCart, type CartProviderState } from "@/hooks/cart";
import { useAuth } from "@/hooks/auth";
import { zOrderCreate } from "@/lib/generated/zod.gen";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { CartContents } from "@/components/cart";
import { toast } from "sonner";
import { PayPalButtons, PayPalScriptProvider, type ReactPayPalScriptOptions } from "@paypal/react-paypal-js";
import { useNonce } from "@/hooks/nonce";

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
    return forward(() => sdk.orders.getOrdersMeById({ ...auth, path: { id } }), true);
}

export default function CheckoutPage({ loaderData }: Route.ComponentProps) {
    return (
        <div className="container mx-auto max-w-2xl px-4 py-10">
            {loaderData ? <OrderView order={loaderData} /> : <CartView />}
        </div>
    );
}

function OrderView({ order }: { order: OrderWithProducts }) {
    const nonce = useNonce();
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
    const initialOptions: ReactPayPalScriptOptions = {
        clientId: import.meta.env.VITE_clientId,
        currency: order.order.currency,
        dataCspNonce: nonce,
    };
    return (
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
                <PayPalScriptProvider options={initialOptions}>
                    <PayPalButtons
                        style={{
                            disableMaxWidth: true,
                        }}
                        className="w-full p-2 bg-white rounded disabled:cursor-not-allowed disabled:opacity-50"
                    ></PayPalButtons>
                </PayPalScriptProvider>
            </CardFooter>
        </Card>
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
        <Card>
            <CardHeader>
                <CardTitle>Your Cart</CardTitle>
            </CardHeader>
            <CardContent>
                <CartContents variantItemMedia="default" cart={cart} setQuantity={setQuantity} clearCart={clearCart} />
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
    );
}
