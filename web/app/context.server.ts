import { createContext } from "react-router";
import type { User } from "@/lib/client/types.gen";

export const CsrfContext = createContext<string | null>(null);

export const UserContext = createContext<User | null>(null);
