import { createContext } from "react-router";

export const CsrfContext = createContext<string | null>(null);