import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function PascalCase(s: string) {
    s = s.replace(/(\w)(\w*)/g, function (g0, g1, g2) {
        return g1.toUpperCase() + g2.toLowerCase();
    });
    return s;
}

export class EnumX {
    static of<T extends object>(e: T) {
        const values = Object.values(e);
        return {
            next: <K extends keyof T>(v: T[K]): T[K] => values[(values.indexOf(v) + 1) % values.length],
            prev: <K extends keyof T>(v: T[K]): T[K] => values[(values.indexOf(v) - 1 + values.length) % values.length],
        };
    }
}