import type { Route } from "./+types/checkout.($id)";
import type { OrderWithProducts, Product } from "@/lib/generated/types.gen";
import type { PageHandle } from "@/types";
import { redirect, useNavigate } from "react-router";
import { useState } from "react";
import { sdk } from "@/lib/utils";
import { getAuth, forward } from "@/lib/server.utils";
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
    const auth = await getAuth(request);
    return forward(() => sdk.orders.getOrdersMeById({ ...auth, path: { id } }), true);
}

export default function CheckoutPage({ loaderData }: Route.ComponentProps) {
    const [order, setOrder] = useState<OrderWithProducts | null>(loaderData ?? null);

    return (
        <div className="container mx-auto max-w-6xl px-4 py-10">
            <CheckoutView order={order} onOrderChange={setOrder} />
        </div>
    );
}

function CheckoutView({
    order,
    onOrderChange,
}: {
    order: OrderWithProducts | null;
    onOrderChange: (order: OrderWithProducts | null) => void;
}) {
    const { cart, setQuantity, clearCart } = useCart();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);

    const productMap = order ? new Map(order.products.map((p) => [p.id, p])) : null;
    const displayCart: CartProviderState["cart"] = order
        ? {
              ray_id: order.order.ray_id!,
              products: Object.fromEntries(
                  order.order.products.map((p) => [p.id, { p: productMap!.get(p.id)!, q: p.count }]),
              ),
          }
        : cart;

    async function handleCheckout(c: NonNullable<typeof cart>) {
        if (!user?.id) {
            toast.error("You must be logged in to checkout");
            return;
        }
        setSubmitting(true);
        const { data, error } = await sdk.orders.postOrdersMe({
            body: zOrderCreate.parse({
                user_id: user.id,
                ray_id: c.ray_id,
                products: Object.values(c.products).map(({ p, q }) => ({
                    id: p.id,
                    price: p.price,
                    count: q,
                    name: p.name,
                })),
            }),
        });
        setSubmitting(false);
        if (error || !data) {
            toast.error("Failed to place order: " + (error?.message || "Unknown error"));
            return;
        }
        clearCart();
        onOrderChange({
            order: data,
            products: Object.values(c.products).map(({ p }) => p) as Product[],
        });
        toast.success("Order placed!");
        navigate(`/checkout/${data.id}`, { replace: true });
    }

    return (
        <Card>
            <CardHeader>
                {order ? (
                    <div className="flex gap-2 items-center">
                        <CardTitle>Order ID: {order.order.id}</CardTitle>
                        {order.order.paid ? (
                            <Badge variant="secondary" className="bg-blue-500 text-white dark:bg-blue-600">
                                Paid
                            </Badge>
                        ) : (
                            <Badge variant="destructive">Unpaid</Badge>
                        )}
                    </div>
                ) : (
                    <CardTitle>Your Cart</CardTitle>
                )}
            </CardHeader>
            <CardContent>
                <CartContents
                    variantItemMedia="default"
                    mediaClassName="w-32 h-32"
                    resize={0.4}
                    cart={displayCart}
                    setQuantity={!order ? setQuantity : undefined}
                    clearCart={
                        order && !order.order.paid
                            ? () => {
                                  sdk.orders.deleteOrdersMeById({ path: { id: order.order.id! } }).then(({ error }) => {
                                      if (error) {
                                          toast.error("Failed to cancel order: " + error.message);
                                          return;
                                      }
                                      toast.success("Order cancelled");
                                      navigate("/me");
                                  });
                              }
                            : !order
                              ? clearCart
                              : undefined
                    }
                />
            </CardContent>
            <CardFooter>
                <div className={order && !order.order.paid ? "w-full" : "hidden"}>
                    <PayPalButtons
                        style={{ disableMaxWidth: true }}
                        className="w-full p-2 bg-white rounded disabled:cursor-not-allowed disabled:opacity-50 z-0! relative"
                        createOrder={async () => {
                            if (!order) throw new Error("No order");
                            const { data, error } = await sdk.paypal.postPaypalMeById({
                                path: { id: order.order.id! },
                            });
                            if (error || !data) {
                                toast.error(`Failed to create PayPal order: ${error?.message || "Unknown error"}`);
                                throw new Error(error?.message || "Unknown error");
                            }
                            return data.transaction_id;
                        }}
                        onApprove={async (data, actions) => {
                            if (!order) return;
                            const { data: result, error } = await sdk.paypal.patchPaypalMeById({
                                path: { id: data.orderID },
                            });
                            if (error || !result) {
                                toast.error(`Failed to capture PayPal order: ${error?.message || "Unknown error"}`);
                                return;
                            }
                            if (result.status === "COMPLETED") {
                                onOrderChange({ ...order, order: { ...result.order! } });
                                toast.success("Payment successful!");
                            } else if (result.status === "PENDING") {
                                toast.error("Payment could not be completed. Try again");
                                actions.restart();
                            } else {
                                toast.error(`Payment failed with status: ${result.status}`);
                            }
                        }}
                    />
                </div>
                {!order && (
                    <Button
                        className="w-full"
                        onClick={() => cart && handleCheckout(cart)}
                        disabled={submitting || !cart || Object.keys(cart.products).length === 0}
                    >
                        {submitting ? <Spinner /> : "Checkout"}
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}
