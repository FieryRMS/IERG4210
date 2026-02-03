"use client";
import type { Product } from "@/types";
import { createContext, useContext, useState } from "react";

type CartProviderState = {
    cart: Map<string, { p: Product; q: number }>;
    addQuantity: (product: Product, quantity?: number) => void;
    removeQuantity: (product: Product, quantity?: number) => void;
    setQuantity: (product: Product, quantity: number) => void;
};

const CartProviderContext = createContext<CartProviderState>({
    cart: new Map(),
    addQuantity: () => null,
    removeQuantity: () => null,
    setQuantity: () => null,
});

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [cart, setCart] = useState<CartProviderState["cart"]>(new Map());

    const value: CartProviderState = {
        cart,
        addQuantity: (product: Product, quantity: number = 1) => {
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
        removeQuantity: (product: Product, quantity: number = 1) => {
            setCart((prevCart) => {
                const newCart = new Map(prevCart);
                const existingItem = newCart.get(product.id);
                if (existingItem) {
                    if (existingItem.q - quantity <= 0) {
                        newCart.delete(product.id);
                    } else {
                        newCart.set(product.id, { p: existingItem.p, q: existingItem.q - quantity });
                    }
                }
                return newCart;
            });
        },
        setQuantity: (product: Product, quantity: number) => {
            setCart((prevCart) => {
                const newCart = new Map(prevCart);
                if (quantity <= 0) {
                    newCart.delete(product.id);
                } else {
                    newCart.set(product.id, { p: product, q: quantity });
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
