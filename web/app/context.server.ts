import { createContext } from "react-router";
import type { User } from "@/lib/generated/types.gen";

export const CsrfContext = createContext<string | null>(null);

export const UserContext = createContext<User | null>(null);
