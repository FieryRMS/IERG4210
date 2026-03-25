import { createCookieSessionStorage } from "react-router";

type SessionData = {
    userId?: string;
};

type SessionFlashData = {
    error: string;
};

export const { getSession, commitSession, destroySession } = createCookieSessionStorage<SessionData, SessionFlashData>({
    cookie: {
        name: process.env.API_MODE === "dev" ? "session" : "__Host-session",
        httpOnly: true,
        secure: process.env.API_MODE !== "dev",
        sameSite: "strict",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        secrets: [process.env.SESSION_SECRET!],
    },
});