import { createCookie } from "react-router";
import type { Theme } from "./hooks/theme-provider";

export const prefsCookie = createCookie("prefs", {
    maxAge: 60 * 60 * 24 * 400, // 400 days
});

export type Prefs = {
    theme: Theme;
};