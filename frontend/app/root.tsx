import {
    isRouteErrorResponse,
    Links,
    Meta,
    Outlet,
    Scripts,
    ScrollRestoration,
} from "react-router";

import "@radix-ui/themes/styles.css";
import { Theme } from "@radix-ui/themes";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from "react";
import { I18nextProvider } from "react-i18next";
import i18n, { initLanguage } from "./i18n";

import type {Route} from "./+types/root";
import "./app.css";
import ErrorPage from "./components/ErrorPage";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
});

export const links: Route.LinksFunction = () => [
    {rel: "preconnect", href: "https://fonts.googleapis.com"},
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

export function Layout({children}: { children: React.ReactNode }) {
    useEffect(() => {
        initLanguage();
    }, []);

    return (
        <html lang="en">
        <head>
            <meta charSet="utf-8"/>
            <meta name="viewport" content="width=device-width, initial-scale=1"/>
            <Meta/>
            <Links/>
        </head>
        <body>
        <I18nextProvider i18n={i18n}>
            <QueryClientProvider client={queryClient}>
                <Theme>
                    {children}
                    <ScrollRestoration/>
                    <Scripts/>
                </Theme>
            </QueryClientProvider>
        </I18nextProvider>
        </body>
        </html>
    );
}

export default function App() {
    return <Outlet/>;
}

export function ErrorBoundary({error}: Route.ErrorBoundaryProps) {
    let status = 500;
    let title: string | undefined;
    let description: string | undefined;

    if (isRouteErrorResponse(error)) {
        status = error.status;
        if (error.statusText) {
            title = error.statusText;
        }
        if (typeof error.data === "string" && error.data.length > 0) {
            description = error.data;
        } else if (error.data && typeof error.data === "object" && "message" in error.data) {
            description = String((error.data as { message: unknown }).message);
        }
    } else if (import.meta.env.DEV && error instanceof Error) {
        description = error.message;
    }

    return <ErrorPage status={status} title={title} description={description} />;
}
