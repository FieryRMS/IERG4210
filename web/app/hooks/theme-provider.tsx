"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { prefsCookie } from "@/prefs.cookies";
import { EnumX } from "@/lib/utils";

export enum Theme {
    Dark = "dark",
    Light = "light",
    System = "system",
}

type ThemeProviderProps = {
    children: React.ReactNode;
    defaultTheme?: Theme;
};

type ThemeProviderState = {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
};

const initialState: ThemeProviderState = {
    theme: Theme.Dark,
    setTheme: () => null,
    toggleTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

async function saveTheme(theme: Theme) {
    document.cookie = await prefsCookie.serialize({ theme });
}

function getPrefersColorScheme(): Theme.Dark | Theme.Light {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? Theme.Dark : Theme.Light;
}

export function ThemeProvider({ children, defaultTheme, ...props }: ThemeProviderProps) {
    const [theme, setTheme] = useState<Theme>(() => {
        if (Object.values(Theme).includes(defaultTheme as Theme)) {
            return defaultTheme as Theme;
        }
        return Theme.System;
    });

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove(Theme.Dark, Theme.Light, Theme.System);
        root.classList.add(theme);
        if (theme === Theme.System) {
            root.classList.add(getPrefersColorScheme());
        }
    }, [theme]);

    const value = {
        theme,
        setTheme: (theme: Theme) => {
            saveTheme(theme);
            setTheme(theme);
        },
        toggleTheme: () => {
            setTheme((prevTheme) => {
                const isDark = getPrefersColorScheme() === Theme.Dark;
                const themeEnum = EnumX.of(Theme);
                const nextTheme = !isDark ? themeEnum.next(prevTheme) : themeEnum.prev(prevTheme);
                saveTheme(nextTheme);
                return nextTheme;
            });
        },
    };

    return (
        <ThemeProviderContext.Provider {...props} value={value}>
            {children}
        </ThemeProviderContext.Provider>
    );
}

export const useTheme = () => {
    const context = useContext(ThemeProviderContext);

    if (context === undefined) throw new Error("useTheme must be used within a ThemeProvider");

    return context;
};
