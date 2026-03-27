import { createContext } from "react-router";
import type { User } from "./types";

export const CsrfContext = createContext<string | null>(null);

export const UserContext = createContext<User | null>(null);
