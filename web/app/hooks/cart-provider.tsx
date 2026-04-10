import { createContext, useContext, useEffect, useState } from "react";
import { z } from "zod";
import { zProduct } from "@/lib/generated/zod.gen";

const CartItemSchema = z.object({
    products: z.record(z.string(), z.object({ p: zProduct, q: z.number() })),
    ray_id: z.string(),
});
type Product = z.infer<typeof zProduct>;
type CartProviderState = {
    cart: z.infer<typeof CartItemSchema> | null;
    addQuantity: (product: Product, quantity?: number) => void;
    removeQuantity: (product: Product, quantity?: number) => void;
    setQuantity: (product: Product, quantity: number) => void;
    clearCart: () => void;
};

const CartProviderContext = createContext<CartProviderState>({
    cart: null,
    addQuantity: () => null,
    removeQuantity: () => null,
    setQuantity: () => null,
    clearCart: () => null,
});

function createNewCart(): z.infer<typeof CartItemSchema> {
    return {
        products: {},
        ray_id: crypto.randomUUID(),
    };
}

function saveCartToLocalStorage(cart: z.infer<typeof CartItemSchema>) {
    localStorage.setItem("cart", JSON.stringify(cart));
}

function loadCartFromLocalStorage(): z.infer<typeof CartItemSchema> {
    const cartData = localStorage.getItem("cart");
    if (cartData) {
        try {
            const parsedCart = CartItemSchema.parse(JSON.parse(cartData));
            return parsedCart;
        } catch {
            //
        }
    }
    return createNewCart();
}

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [cart, setCart] = useState<CartProviderState["cart"]>(null);

    useEffect(() => {
        const handleStorageChange = () => {
            const storedCart = loadCartFromLocalStorage();
            setCart(storedCart);
        };
        window.addEventListener("storage", handleStorageChange);
        handleStorageChange();
        return () => {
            window.removeEventListener("storage", handleStorageChange);
        };
    }, []);

    const value: CartProviderState = {
        cart,
        addQuantity: (product: Product, quantity: number = 1) => {
            setCart((prevCart) => {
                if (!prevCart) return null; // not loaded yet
                if (product.id === undefined) return prevCart; // shouldn't happen
                const newCart = structuredClone(prevCart);
                const existingItem = newCart.products[product.id];
                if (existingItem) {
                    newCart.products[product.id] = { p: existingItem.p, q: existingItem.q + quantity };
                } else {
                    newCart.products[product.id] = { p: product, q: quantity };
                }
                saveCartToLocalStorage(newCart);
                return newCart;
            });
        },
        removeQuantity: (product: Product, quantity: number = 1) => {
            setCart((prevCart) => {
                if (!prevCart) return null; // not loaded yet
                if (product.id === undefined) return prevCart; // shouldn't happen
                const newCart = structuredClone(prevCart);
                const existingItem = newCart.products[product.id];
                if (existingItem) {
                    if (existingItem.q - quantity <= 0) {
                        delete newCart.products[product.id];
                    } else {
                        newCart.products[product.id] = { p: existingItem.p, q: existingItem.q - quantity };
                    }
                }
                saveCartToLocalStorage(newCart);
                return newCart;
            });
        },
        setQuantity: (product: Product, quantity: number) => {
            setCart((prevCart) => {
                if (!prevCart) return null; // not loaded yet
                if (product.id === undefined) return prevCart; // shouldn't happen
                const newCart = structuredClone(prevCart);
                if (quantity <= 0) {
                    delete newCart.products[product.id];
                } else {
                    newCart.products[product.id] = { p: product, q: quantity };
                }
                saveCartToLocalStorage(newCart);
                return newCart;
            });
        },
        clearCart: () =>
            setCart(() => {
                const newCart = createNewCart();
                saveCartToLocalStorage(newCart);
                return newCart;
            }),
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
