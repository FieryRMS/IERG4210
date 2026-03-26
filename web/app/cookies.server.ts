import { createCookie } from "react-router";

export const csrfCookie = createCookie(process.env.API_MODE === "dev" ? "csrf" : "__Host-csrf", {
    httpOnly: true,
    secure: process.env.API_MODE !== "dev",
    sameSite: "strict",
    maxAge: 60 * 60 * 12, // 12 hours
    secrets: [process.env.SIGNING_SECRET!],
});