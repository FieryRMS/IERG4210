"use client";
import type { Product } from "@/types";
import { createContext, useContext, useState } from "react";

type CartProviderState = {
    cart: Map<string, { p: Product; q: number }>;
    addToCart: (product: Product, quantity?: number) => void;
    removeFromCart: (productId: string, quantity?: number) => void;
};

const CartProviderContext = createContext<CartProviderState>({
    cart: new Map(),
    addToCart: () => null,
    removeFromCart: () => null,
});

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [cart, setCart] = useState<CartProviderState["cart"]>(new Map());

    const value: CartProviderState = {
        cart,
        addToCart: (product: Product, quantity: number = 1) => {
            setCart((prevCart) => {
                const newCart = new Map(prevCart);
                const existingItem = newCart.get(product.id);
                if (existingItem) {
                    newCart.set(product.id, { p: existingItem.p, q: existingItem.q + quantity });
                } else {
                    newCart.set(product.id, { p: product, q: quantity });
                }
                return newCart;
            });
        },
        removeFromCart: (productId: string, quantity: number = 1) => {
            setCart((prevCart) => {
                const newCart = new Map(prevCart);
                const existingItem = newCart.get(productId);
                if (existingItem) {
                    newCart.set(productId, { p: existingItem.p, q: existingItem.q - quantity });
                    if (existingItem.q <= 0) {
                        newCart.delete(productId);
                    } else {
                        newCart.set(productId, existingItem);
                    }
                }
                return newCart;
            });
        },
    };
    return <CartProviderContext.Provider value={value}>{children}</CartProviderContext.Provider>;
}

export function useCart() {
    const context = useContext(CartProviderContext);
    if (!context) {
        throw new Error("useCart must be used within a CartProvider");
    }
    return context;
}
