import type { Route } from "./+types/checkout.($id)";
import type { Order, OrderWithProducts, PaypalTransaction } from "@/lib/generated/types.gen";
import type { PageHandle } from "@/types";
import { redirect, useNavigate } from "react-router";
import { useState } from "react";
import { sdk, applyAuth, forward } from "@/lib/server.utils";
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
import { PayPalButtons } from "@paypal/react-paypal-js";
import { clientForward } from "@/lib/utils";

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
        <div className="container mx-auto max-w-6xl px-4 py-10">
            {loaderData ? <OrderView order={loaderData} /> : <CartView />}
        </div>
    );
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
                    clearCart={
                        !order.order.paid
                            ? () => {
                                  clientForward(() => fetch(`/api/order/${order.order.id}`, { method: "DELETE" }))
                                      .then(() => {
                                          toast.success("Order cancelled");
                                          navigate("/me");
                                      })
                                      .catch((e) => {
                                          toast.error(`Failed to cancel order: ${e.message}`);
                                      });
                              }
                            : undefined
                    }
                />
            </CardContent>
            <CardFooter>
                {!order.order.paid && (
                    <PayPalButtons
                        style={{
                            disableMaxWidth: true,
                        }}
                        className="w-full p-2 bg-white rounded disabled:cursor-not-allowed disabled:opacity-50 z-0!"
                        createOrder={async () => {
                            return clientForward<PaypalTransaction>(() =>
                                fetch(`/api/paypal/${order.order.id}`, { method: "POST" }),
                            )
                                .then((data) => data.transaction_id)
                                .catch((e) => {
                                    toast.error(`Failed to create PayPal order: ${e.message}`);
                                    throw e;
                                });
                        }}
                        onApprove={async (data, actions) => {
                            clientForward<PaypalTransaction>(() =>
                                fetch(`/api/paypal/${data.orderID}`, {
                                    method: "PUT",
                                }),
                            )
                                .then((data) => {
                                    if (data.status === "COMPLETED") {
                                        toast.success("Payment successful!");
                                        navigate(0);
                                    } else if (data.status === "PENDING") {
                                        toast("Payment could not be completed. Try again");
                                        actions.restart();
                                    }
                                })
                                .catch((e) => {
                                    toast.error(`Failed to capture PayPal order: ${e.message}`);
                                });
                        }}
                    />
                )}
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
        clientForward<Order>(() =>
            fetch("/api/order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(
                    zOrderCreate.parse({
                        user_id: user.id,
                        ray_id: c.ray_id,
                        products: Object.values(c.products).map(({ p, q }) => ({
                            id: p.id,
                            price: p.price,
                            count: q,
                            name: p.name,
                        })),
                    }),
                ),
            }),
        )
            .then((order) => {
                clearCart();
                toast.success("Order placed! Redirecting...");
                navigate(`/checkout/${order.id}`);
            })
            .catch((e) => {
                toast.error("Failed to place order: " + e.message);
            })
            .finally(() => {
                setSubmitting(false);
            });
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
