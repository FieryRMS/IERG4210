import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { FormAsyncValidateOrFn, StandardSchemaV1 } from "@tanstack/form-core";
import type { paths } from "./api";
import createClient from "openapi-fetch";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
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

export const onChangeAsync = <TFormData,>(schema: StandardSchemaV1<TFormData, unknown>): FormAsyncValidateOrFn<TFormData> => {
    return ({ formApi }) => {
        const errors = formApi.parseValuesWithSchema(schema);
        if (!errors) return errors;

        const dirtyFields = Object.keys(formApi.fieldInfo).filter(
            (key) => formApi.getFieldMeta(key as keyof typeof formApi.fieldInfo)!.isDirty,
        );
        return {
            form: Object.fromEntries(Object.entries(errors.form).filter(([key]) => dirtyFields.includes(key))),
            fields: Object.fromEntries(
                Object.entries(errors.fields).filter(([key]) => dirtyFields.includes(key)),
            ),
        };
    };
};


export function getClient() {
    return createClient<paths>({ baseUrl: process.env.API_URL });
}

export function isPrimitive(value: unknown): boolean {
    const type = typeof value;
    return type === "string" || type === "number" || type === "boolean";
}

function getChildKeys(formData: FormData, parentKey: string): string[] {
    const prefix = `${parentKey}[`;
    const seen = new Set<string>();
    for (const key of formData.keys()) {
        if (key.startsWith(prefix)) {
            const rest = key.slice(prefix.length);
            const end = rest.indexOf(']');
            if (end !== -1) seen.add(rest.slice(0, end));
        }
    }
    return [...seen];
}

export function Any2FormData(data: unknown, parentKey = "root", result = new FormData()) {
    if (typeof data === 'symbol' || typeof data === 'bigint' || typeof data === 'function') {
        throw new Error(`Any2FormData does not support data of type ${typeof data} at key "${parentKey}"`);
    }
    if (data === undefined) return result;
    if (data === null) {
        result.append(`${parentKey}.__type`, "null");
        return result;
    }
    if (isPrimitive(data)) {
        result.append(parentKey, String(data));
        return result;
    }
    if (data instanceof File) {
        result.append(parentKey, data);
        return result;
    }
    if (typeof data !== "object") {
        throw new Error(`Any2FormData does not support data of type ${typeof data} at key "${parentKey}"`);
    }

    const isArray = Array.isArray(data);
    result.append(`${parentKey}.__type`, isArray ? "array" : "object");

    for (const [key, value] of Object.entries(data))
        Any2FormData(value, `${parentKey}[${key}]`, result);
    return result;
}

export function FormData2Any(formData: FormData, parentKey = "root"): unknown {
    const type = formData.get(`${parentKey}.__type`);

    if (type === "null") return null;

    if (type === "array") {
        return getChildKeys(formData, parentKey)
            .map(Number)
            .filter((n) => !isNaN(n))
            .sort((a, b) => a - b)
            .map((i) => FormData2Any(formData, `${parentKey}[${i}]`));
    }

    if (type === "object") {
        return Object.fromEntries(
            getChildKeys(formData, parentKey)
                .map((key) => [key, FormData2Any(formData, `${parentKey}[${key}]`)])
        );
    }

    if (type !== null) {
        throw new Error(`FormData2Any: unknown __type "${type}" at key "${parentKey}"`);
    }

    // Primitive or File — null means the key was absent (undefined in original)
    return formData.get(parentKey) ?? undefined;
}
