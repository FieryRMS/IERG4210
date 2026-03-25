import { randomBytes } from "node:crypto";

export function generateNonce(): string {
    return randomBytes(16).toString("base64");
}

export interface SecurityHeaders {
    "Content-Security-Policy": string;
    "X-Frame-Options": string;
    "X-Content-Type-Options": string;
    "Referrer-Policy": string;
    "Permissions-Policy": string;
}

export function buildSecurityHeaders(nonce: string): SecurityHeaders {
    return {
        "Content-Security-Policy": [
            "default-src 'self'",
            `script-src 'self' 'nonce-${nonce}'`,
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: blob: https://avatar.vercel.sh",
            "connect-src 'self'",
            "frame-ancestors 'none'",
        ].join("; "),
        "X-Frame-Options": "DENY",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    };
}
