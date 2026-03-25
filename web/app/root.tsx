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
import { useCallback } from "react";
import { prefsCookie } from "@/cookies";
import { getSession, commitSession } from "@/session.server";
import { Toaster } from "@/components/ui/sonner";
import { getClient } from "./lib/utils";

const authMiddleware: Route.MiddlewareFunction = async ({ request }, next) => {
    const session = await getSession(request.headers.get("Cookie"));
    const response = await next();
    response.headers.append("Set-Cookie", await commitSession(session));
    return response;
};

export const middleware: Route.MiddlewareFunction[] = [authMiddleware];

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

export async function loader({ request }: Route.LoaderArgs) {
    const client = getClient();
    const cookieHeader = request.headers.get("Cookie");
    const prefs = (await prefsCookie.parse(cookieHeader)) || {};
    const theme: Theme = prefs.theme || Theme.System;
    return {
        theme,
        system: theme === Theme.System ? request.headers.get("Sec-Ch-Prefers-Color-Scheme") || "" : "",
        categories: (await client.GET("/categories/")).data || [],
    };
}

export function Layout() {
    const nonce = useNonce();
    const loaderData = useLoaderData<Route.ComponentProps["loaderData"]>();
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

    return (
        <html lang="en" className={`${loaderData?.theme} ${loaderData?.system} bg-background`}>
            <head>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <Meta />
                <Links nonce={nonce} />
                <script nonce={nonce}>
                    {`
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
            </ThemeProvider>
        </html>
    );
}

export default function App() {
    return <Outlet />;
}

// TODO: use "empty" for a better error boundary UI
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
    let message = "Oops!";
    let details = "An unexpected error occurred.";
    let stack: string | undefined;

    if (isRouteErrorResponse(error)) {
        message = error.status === 404 ? "404" : "Error";
        details = error.status === 404 ? "The requested page could not be found." : error.statusText || details;
    } else if (import.meta.env.DEV && error && error instanceof Error) {
        details = error.message;
        stack = error.stack;
    }

    return (
        <main className="pt-16 p-4 container mx-auto">
            <h1>{message}</h1>
            <p>{details}</p>
            {stack && (
                <pre className="w-full p-4 overflow-x-auto">
                    <code>{stack}</code>
                </pre>
            )}
        </main>
    );
}

export const handle: PageHandle = {
    breadcrumb: ({ pathname }) => ({
        pathname,
        name: "Home",
    }),
};
