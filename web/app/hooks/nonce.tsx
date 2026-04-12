import { createContext, useContext } from "react";

const NonceContext = createContext<string | undefined>(undefined);

export function useNonce(): string | undefined {
    const nonce = useContext(NonceContext);
    if (nonce === undefined) {
        console.warn("useNonce: No nonce found in context, CSP may not work as intended.");
    }
    return nonce;
}

export function NonceProvider({ nonce, children }: { nonce?: string; children: React.ReactNode }) {
    if (!nonce) {
        console.warn("NonceProvider: No nonce provided, CSP may not work as intended.");
    }
    return <NonceContext.Provider value={nonce}>{children}</NonceContext.Provider>;
}
