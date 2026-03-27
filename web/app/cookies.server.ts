import { createCookie, type Cookie } from "react-router";
import { parse } from "cookie";


export const csrfCookie = createCookie(process.env.API_MODE === "dev" ? "csrf" : "__Host-csrf", {
    httpOnly: true,
    secure: process.env.API_MODE !== "dev",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12, // 12 hours
    secrets: [process.env.SIGNING_SECRET!],
});

export const sessionCookie: Cookie = {
    isSigned: false,
    name: "__Host-session",
    async serialize(_value, _options) {
        throw new Error("Session cookie should not be set in the frontend");
    },
    async parse(cookieHeader, options) {
        const cookies = parse(cookieHeader || "", options);
        return cookies["__Host-session"] || null;
    },
};