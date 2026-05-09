import { createCookie } from "react-router";

import { randomBytes, createHmac, timingSafeEqual } from 'node:crypto';
import { createContext } from "react-router";
import type { User } from "@/lib/generated/types.gen";



export function generateNonce(): string {
    return randomBytes(16).toString("base64");
}

export interface SecurityHeaders {
    "Content-Security-Policy": string;
    "X-Frame-Options": string;
    "X-Content-Type-Options": string;
    "Referrer-Policy": string;
    "Permissions-Policy": string;
    "Strict-Transport-Security": string;
}

export function buildSecurityHeaders(nonce: string | undefined): SecurityHeaders {
    if (!nonce)
        console.warn("buildSecurityHeaders: No nonce provided, CSP may not work as intended.");
    return {
        "Content-Security-Policy": [
            "default-src 'self'",
            `script-src 'self' *.paypal.com *.paypalobjects.com *.venmo.com${nonce ? ` 'nonce-${nonce}'` : ''}`,
            `style-src 'self' 'unsafe-inline' fonts.googleapis.com *.paypal.com *.paypalobjects.com *.venmo.com`,
            "font-src 'self' fonts.gstatic.com",
            "img-src 'self' data: blob: avatar.vercel.sh *.paypal.com *.paypalobjects.com *.venmo.com",
            "worker-src 'self' blob:",
            "connect-src 'self' *.paypal.com *.paypalobjects.com *.venmo.com",
            "frame-src 'self' *.paypal.com *.paypalobjects.com *.venmo.com",
            "child-src 'self' *.paypal.com *.paypalobjects.com *.venmo.com",
            "frame-ancestors 'none'",
        ].join("; "),
        "X-Frame-Options": "DENY",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
    };
}

export const nonceContext = createContext<string | undefined>(undefined);

const createTokenGenerator = ({
    size,
    saltLength = 16,
    maxAge = 60 * 60 * 12,
    secret,
}: {
    size: number;
    saltLength?: number;
    maxAge?: number;
    secret: string;
}) => {
    const signToken = (token: Buffer, secret: string) =>
        createHmac('sha256', secret).update(token).digest('hex');

    const generateSalt = () => randomBytes(saltLength).toString('hex');

    const generateSignedToken = (salt: string) => {
        const token = randomBytes(size);
        const expires = Date.now() + maxAge * 1000;
        const buf = Buffer.alloc(token.length + 8);
        token.copy(buf);
        buf.writeBigUInt64BE(BigInt(expires), token.length);
        const sig = signToken(buf, secret + salt);
        return `${buf.toString('hex')}.${sig}`;
    };

    const verifySignedToken = (token: string, salt: string) => {
        const [hex, sig] = token.split('.');
        if (!hex || !sig) return false;
        const buf = Buffer.from(hex, 'hex');
        const expected = signToken(buf, secret + salt);
        if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
        const expires = buf.readBigUInt64BE(buf.length - 8);
        return expires > BigInt(Date.now());
    };

    return { generateSalt, generateSignedToken, verifySignedToken };
};

export const cstfTokenGenerator = createTokenGenerator({
    size: 32,
    secret: process.env.SIGNING_SECRET ?? "default_secret",
});

export const csrfCookie = createCookie("__Host-csrf", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12, // 12 hours
    secrets: [process.env.SIGNING_SECRET!],
});
export const CsrfContext = createContext<string | null>(null);

export const sessionCookie = createCookie("__Host-session", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    secrets: [process.env.SIGNING_SECRET!],
});
export const UserContext = createContext<User | null>(null);