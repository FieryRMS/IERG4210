import {
    type BlockerFunction,
    isRouteErrorResponse,
    Links,
    Meta,
    Outlet,
    Scripts,
    ScrollRestoration,
    useBlocker,
    useLocation,
    useMatches,
    type Location,
    type UIMatch,
    useLoaderData,
} from "react-router";
import { NonceProvider } from "@/hooks/nonce";
import { ThemeProvider, Theme } from "@/hooks/theme";

import type { Route } from "./+types/root";
import "./app.css";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import type { LocationState, PageHandle } from "./types";
import { CartProvider } from "./hooks/cart";
import { AuthProvider } from "./hooks/auth";
import { useCallback, useEffect } from "react";
import { prefsCookie } from "@/lib/cookies";
import {
    csrfCookie,
    cstfTokenGenerator,
    CsrfContext,
    UserContext,
    generateNonce,
    nonceContext,
} from "@/lib/security.server";
import { Toaster } from "@/components/ui/sonner";
import { sdk, applyAuth, applySessionCookie } from "./lib/server.utils";
import { ServerException, ServerForbiddenException } from "./lib/errors";
import { ErrorPage } from "@/components/error-page";
import { getReasonPhrase } from "http-status-codes";

const authMiddleware: Route.MiddlewareFunction = async ({ request, context }, next) => {
    const { data, response: sdkResponse } = await sdk.users.getUsersMe(await applyAuth(request));
    context.set(UserContext, data || null);
    const response = await next();
    await applySessionCookie(sdkResponse.headers, response.headers);
    return response;
};

const nonceMiddleware: Route.MiddlewareFunction = async ({ context }, next) => {
    const nonce = generateNonce();
    context.set(nonceContext, nonce);
    return await next();
};

const csrfMiddleware: Route.MiddlewareFunction = async ({ request, context }, next) => {
    const cookieHeader = request.headers.get("Cookie");
    let csrfSalt = await csrfCookie.parse(cookieHeader);
    if (["POST", "PUT", "DELETE"].includes(request.method)) {
        const csrfToken = request.headers.get("X-CSRF-Token");
        if (!csrfToken || !csrfSalt || !cstfTokenGenerator.verifySignedToken(csrfToken, csrfSalt)) {
            throw new ServerForbiddenException();
        }
    } else {
        if (!csrfSalt) csrfSalt = cstfTokenGenerator.generateSalt();
        const token = cstfTokenGenerator.generateSignedToken(csrfSalt);
        context.set(CsrfContext, token);
    }
    const response = await next();
    response.headers.append("Set-Cookie", await csrfCookie.serialize(csrfSalt));
    return response;
};

export const middleware: Route.MiddlewareFunction[] = [authMiddleware, csrfMiddleware, nonceMiddleware];

export const links: Route.LinksFunction = () => [
    { rel: "preconnect", href: "https://fonts.googleapis.com" },
    {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
    },
    {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
    },
];

export async function loader({ request, context }: Route.LoaderArgs) {
    const cookieHeader = request.headers.get("Cookie");
    const prefs = (await prefsCookie.parse(cookieHeader)) || {};
    const theme: Theme = prefs.theme || Theme.System;
    return {
        theme,
        system: theme === Theme.System ? request.headers.get("Sec-Ch-Prefers-Color-Scheme") || "" : "",
        categories: (await sdk.categories.getCategories(await applyAuth(request))).data || [],
        csrfToken: context.get(CsrfContext),
        user: context.get(UserContext),
        nonce: context.get(nonceContext),
    };
}

export function Layout({ children }: { children: React.ReactNode }) {
    const loaderData = useLoaderData<Route.ComponentProps["loaderData"] | undefined>();
    const nonce = loaderData?.nonce;
    const location: Location<LocationState> = useLocation();
    const matches = useMatches();
    const breadcrumbs = (matches as UIMatch<unknown, PageHandle>[])
        .filter((match) => match.handle && match.handle.breadcrumb)
        .map((match) => match.handle.breadcrumb!(match));

    const shouldBlock = useCallback<BlockerFunction>(
        ({ currentLocation, nextLocation, historyAction }) => {
            // if pushing new entry
            if (
                historyAction === "PUSH" &&
                currentLocation.pathname === location.pathname &&
                nextLocation.pathname !== currentLocation.pathname
            ) {
                // remove root breadcrumb if exists to avoid duplication
                if (location.state?.breadcrumbs?.[0]?.pathname === "/") breadcrumbs.shift();
                nextLocation.state = {
                    breadcrumbs: [...(location.state?.breadcrumbs || []), ...breadcrumbs],
                    ...nextLocation.state,
                };
            }
            return false;
        },
        [location, breadcrumbs],
    );
    useBlocker(shouldBlock);

    useEffect(() => {
        window.__csrf = loaderData?.csrfToken || "";
    }, [loaderData?.csrfToken]);

    return (
        <html lang="en" className={`${loaderData?.theme} ${loaderData?.system} bg-background`}>
            <head>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <Meta />
                <Links nonce={nonce} />
                <script nonce={nonce}>
                    {`
                    window.__csrf = "${loaderData?.csrfToken || ""}";
                    const _f=window.fetch;
                    window.fetch=(i,o)=>_f(i,{...o,headers:{"X-CSRF-Token":window.__csrf,...o?.headers}});
                    const classList = document.documentElement.classList;
                    const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: ${Theme.Dark})");
                    function setSystemTheme() {
                        classList.contains("${Theme.System}") &&
                            classList.toggle("${Theme.Dark}", prefersDarkScheme.matches);
                    }
                    prefersDarkScheme.addEventListener("change", setSystemTheme);
                    `}
                </script>
            </head>
            <ThemeProvider defaultTheme={loaderData?.theme}>
                <AuthProvider user={loaderData?.user ?? null}>
                    <NonceProvider nonce={nonce}>
                        <CartProvider>
                            <body className="min-h-screen bg-background font-sans antialiased overflow-x-hidden grid grid-rows-[auto_1fr_auto]">
                                <header className="sticky top-0 z-50 w-full bg-background pb-2">
                                    <Navbar categories={loaderData?.categories || []} />
                                </header>
                                <main className="py-4 w-full h-full">{children}</main>
                                <footer className="w-full py-6">
                                    <Footer />
                                </footer>
                                <ScrollRestoration nonce={nonce} />
                                <Scripts nonce={nonce} />
                                <Toaster theme={loaderData?.theme} />
                            </body>
                        </CartProvider>
                    </NonceProvider>
                </AuthProvider>
            </ThemeProvider>
        </html>
    );
}

export default function App() {
    return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
    let code: number | string = 500;
    let title = "Something went wrong";
    let description = "An unexpected error occurred.";
    let stack: string | undefined;
    if (error instanceof Error) {
        error = new ServerException({}, error);
    }

    if (isRouteErrorResponse(error) && ServerException.isServerException(error.data)) {
        code = error.data.code;
        title = getReasonPhrase(code);
        description = error.data.message!;
        stack = error.data.stack || undefined;
    } else if (isRouteErrorResponse(error)) {
        code = error.status;
        title = error.statusText || title;
        description = error.data || description;
    }

    return <ErrorPage code={code} title={title} description={description} stack={stack} />;
}

export const handle: PageHandle = {
    breadcrumb: ({ pathname }) => ({
        pathname,
        name: "Home",
    }),
};
