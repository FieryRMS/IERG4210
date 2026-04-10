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
import { useNonce } from "@/context/nonce";
import { ThemeProvider, Theme } from "@/hooks/theme-provider";

import type { Route } from "./+types/root";
import "./app.css";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import type { LocationState, PageHandle } from "./types";
import { CartProvider } from "./hooks/cart-provider";
import { AuthProvider } from "./hooks/auth-provider";
import { useCallback, useEffect } from "react";
import { prefsCookie } from "@/prefs.cookies";
import { csrfCookie } from "@/cookies.server";
import { Toaster } from "@/components/ui/sonner";
import { cstfTokenGenerator } from "@/lib/security.server";
import { CsrfContext, UserContext } from "./context.server";
import { sdk, applyAuth, applySessionCookie } from "./lib/server.utils";
import { ServerException } from "./lib/errors";
import { ErrorPage } from "@/components/error-page";

const authMiddleware: Route.MiddlewareFunction = async ({ request, context }, next) => {
    const { data, response: sdkResponse } = await sdk.users.getUsersMe(await applyAuth(request));
    context.set(UserContext, data || null);
    const response = await next();
    await applySessionCookie(sdkResponse.headers, response.headers);
    return response;
};

const csrfMiddleware: Route.MiddlewareFunction = async ({ request, context }, next) => {
    const cookieHeader = request.headers.get("Cookie");
    let csrfSalt = await csrfCookie.parse(cookieHeader);
    if (["POST", "PUT", "DELETE"].includes(request.method)) {
        const csrfToken = request.headers.get("X-CSRF-Token");
        if (!csrfToken || !csrfSalt || !cstfTokenGenerator.verifySignedToken(csrfToken, csrfSalt)) {
            return new Response("Invalid CSRF token", { status: 403 });
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

export const middleware: Route.MiddlewareFunction[] = [authMiddleware, csrfMiddleware];

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
    };
}

export function Layout() {
    const nonce = useNonce();
    const loaderData = useLoaderData<Route.ComponentProps["loaderData"] | undefined>();
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
                    <CartProvider>
                        <body className="min-h-screen bg-background font-sans antialiased overflow-x-hidden grid grid-rows-[auto_1fr_auto]">
                            <header className="sticky top-0 z-50 w-full bg-background pb-2">
                                <Navbar categories={loaderData?.categories || []} />
                            </header>
                            <main className="py-4 w-full h-full">
                                <Outlet />
                            </main>
                            <footer className="w-full py-6">
                                <Footer />
                            </footer>
                            <ScrollRestoration nonce={nonce} />
                            <Scripts nonce={nonce} />
                            <Toaster theme={loaderData?.theme} />
                        </body>
                    </CartProvider>
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

    if (isRouteErrorResponse(error)) {
        code = error.status;
        title = error.status === 404 ? "Page not found" : "Error";
        description = error.status === 404
            ? "The page you're looking for doesn't exist or has been moved."
            : error.statusText || description;
    } else if (error instanceof ServerException) {
        code = error.constructor.code;
        title = error.name;
        description = error.detail;
    } else if (error instanceof Error) {
        title = error.name || title;
        description = error.message;
        if (import.meta.env.DEV) stack = error.stack;
    }

    return <ErrorPage code={code} title={title} description={description} stack={stack} />;
}

export const handle: PageHandle = {
    breadcrumb: ({ pathname }) => ({
        pathname,
        name: "Home",
    }),
};
