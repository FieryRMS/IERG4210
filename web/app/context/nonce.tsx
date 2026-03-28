import { createContext, useContext } from "react";

export const NonceContext = createContext<string>("");

export function useNonce(): string {
    return useContext(NonceContext);
}
