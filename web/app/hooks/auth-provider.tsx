"use client";
import { createContext, useContext, useState } from "react";
import type { User } from "@/lib/generated/types.gen";

type AuthState = {
    user: User | null;
    setUser: (user: User | null) => void;
};

const AuthContext = createContext<AuthState>({
    user: null,
    setUser: () => null,
});

export function AuthProvider({ user: initialUser, children }: { user: User | null; children: React.ReactNode }) {
    const [user, setUser] = useState(initialUser);
    const [prevInitial, setPrevInitial] = useState(initialUser);
    if (prevInitial !== initialUser) {
        setPrevInitial(initialUser);
        setUser(initialUser);
    }

    return <AuthContext.Provider value={{ user, setUser }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    return useContext(AuthContext);
}
