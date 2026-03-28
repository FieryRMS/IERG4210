import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { FormAsyncValidateOrFn, StandardSchemaV1 } from "@tanstack/form-core";

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



function buildChildIndex(formData: FormData): Map<string, Set<string>> {
    const index = new Map<string, Set<string>>();
    for (const key of formData.keys()) {
        let pos = 0;
        while (true) {
            const open = key.indexOf('[', pos);
            if (open === -1) break;
            const close = key.indexOf(']', open);
            if (close === -1) break;
            const parent = key.slice(0, open);
            const child = key.slice(open + 1, close);
            let set = index.get(parent);
            if (!set) { set = new Set(); index.set(parent, set); }
            set.add(child);
            pos = close + 1;
        }
    }
    return index;
}

type JSONLikeType = string | number | boolean | File | null | { [key: string]: JSONLikeType; } | JSONLikeType[];

export function Any2FormData(data: unknown, parentKey = "root", result = new FormData()): FormData {
    if (data === null) {
        result.append(`${parentKey}.__type`, "null");
        return result;
    }
    if (typeof data === "string" || typeof data === "number" || typeof data === "boolean") {
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

function deserialize(formData: FormData, parentKey: string, index: Map<string, Set<string>>): JSONLikeType {
    const type = formData.get(`${parentKey}.__type`);

    if (type === "null") return null;

    if (type === "array" || type === "object") {
        const childKeys = [...(index.get(parentKey) ?? [])];
        if (type === "array") {
            return childKeys
                .map(Number)
                .filter((n) => !isNaN(n))
                .sort((a, b) => a - b)
                .map((i) => deserialize(formData, `${parentKey}[${i}]`, index));
        }
        return Object.fromEntries(
            childKeys.map((key) => [key, deserialize(formData, `${parentKey}[${key}]`, index)])
        );
    }

    if (type !== null) throw new Error(`FormData2Any: unknown __type "${type}" at key "${parentKey}"`);

    const value = formData.get(parentKey);
    if (value === null) throw new Error(`FormData2Any: missing key "${parentKey}"`);
    return value;
}

export function FormData2Any(formData: FormData, parentKey = "root"): JSONLikeType {
    return deserialize(formData, parentKey, buildChildIndex(formData));
}
