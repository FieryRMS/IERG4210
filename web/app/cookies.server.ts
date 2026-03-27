import { createCookie } from "react-router";


export const csrfCookie = createCookie("__Host-csrf", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12, // 12 hours
    secrets: [process.env.SIGNING_SECRET!],
});

export const sessionCookie = createCookie("__Host-session", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    secrets: [process.env.SIGNING_SECRET!],
});