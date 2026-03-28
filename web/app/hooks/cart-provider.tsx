"use client";
import type { Product } from"@/lib/generated/types.gen";
import { createContext, useContext, useEffect, useState } from "react";

type CartProviderState = {
    cart: Record<number | string, { p: Product; q: number }>;
    addQuantity: (product: Product, quantity?: number) => void;
    removeQuantity: (product: Product, quantity?: number) => void;
    setQuantity: (product: Product, quantity: number) => void;
};

const CartProviderContext = createContext<CartProviderState>({
    cart: {},
    addQuantity: () => null,
    removeQuantity: () => null,
    setQuantity: () => null,
});

function saveCartToLocalStorage(cart: CartProviderState["cart"]) {
    localStorage.setItem("cart", JSON.stringify(cart));
}

function loadCartFromLocalStorage(): CartProviderState["cart"] {
    const cartData = localStorage.getItem("cart");
    if (cartData) {
        try {
            const parsedCart = JSON.parse(cartData);
            return parsedCart;
        } catch {
            //
        }
    }
    return {};
}

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [cart, setCart] = useState<CartProviderState["cart"]>({});

    useEffect(() => {
        const storedCart = loadCartFromLocalStorage();
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCart(storedCart);
    }, []);

    useEffect(() => {
        saveCartToLocalStorage(cart);
    }, [cart]);

    const value: CartProviderState = {
        cart,
        addQuantity: (product: Product, quantity: number = 1) => {
            setCart((prevCart) => {
                if (product.id === undefined) return prevCart;
                const newCart = { ...prevCart };
                const existingItem = newCart[product.id];
                if (existingItem) {
                    newCart[product.id] = { p: existingItem.p, q: existingItem.q + quantity };
                } else {
                    newCart[product.id] = { p: product, q: quantity };
                }
                return newCart;
            });
        },
        removeQuantity: (product: Product, quantity: number = 1) => {
            setCart((prevCart) => {
                if (product.id === undefined) return prevCart;
                const newCart = { ...prevCart };
                const existingItem = newCart[product.id];
                if (existingItem) {
                    if (existingItem.q - quantity <= 0) {
                        delete newCart[product.id];
                    } else {
                        newCart[product.id] = { p: existingItem.p, q: existingItem.q - quantity };
                    }
                }
                return newCart;
            });
        },
        setQuantity: (product: Product, quantity: number) => {
            setCart((prevCart) => {
                if (product.id === undefined) return prevCart;
                const newCart = { ...prevCart };
                if (quantity <= 0) {
                    delete newCart[product.id];
                } else {
                    newCart[product.id] = { p: product, q: quantity };
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
