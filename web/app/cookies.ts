import { createCookie } from "react-router";

export const prefsCookie = createCookie("prefs", {
    maxAge: 60 * 60 * 24 * 400, // 400 days
    sameSite: "strict",
});