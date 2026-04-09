import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { standardSchemaValidators, type StandardSchemaV1Issue } from "@tanstack/form-core";
import type { ZodObject } from "zod";

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
function prefixSchemaToErrors(
    issues: readonly StandardSchemaV1Issue[],
    formValue: unknown,
) {
    const schema = new Map<string, StandardSchemaV1Issue[]>();

    for (const issue of issues) {
        const issuePath = issue.path ?? [];

        let currentFormValue = formValue;
        let path = '';

        for (let i = 0; i < issuePath.length; i++) {
            const pathSegment = issuePath[i];
            if (pathSegment === undefined) continue;

            const segment =
                typeof pathSegment === 'object' ? pathSegment.key : pathSegment;

            // Standard Schema doesn't specify if paths should use numbers or stringified numbers for array access.
            // However, if we follow the path it provides and encounter an array, then we can assume it's intended for array access.
            const segmentAsNumber = Number(segment);
            if (Array.isArray(currentFormValue) && !Number.isNaN(segmentAsNumber)) {
                path += `[${segmentAsNumber}]`;
            } else {
                path += (i > 0 ? '.' : '') + String(segment);
            }

            if (typeof currentFormValue === 'object' && currentFormValue !== null) {
                currentFormValue = currentFormValue[segment as never];
            } else {
                currentFormValue = undefined;
            }
        }
        schema.set(path, (schema.get(path) ?? []).concat(issue));
    }

    return Object.fromEntries(schema);
}

export function parseWithSchema
    ({ value, schema, fields = [] }: { value: unknown; schema: ZodObject; fields?: string[]; }): {
        parsed: null;
        errors: ReturnType<typeof standardSchemaValidators["validate"]>;
    } | { parsed: unknown; errors: null; } {
    const result = schema.safeParse(value);
    if (result.success) {
        return { parsed: Object.fromEntries(Object.entries(result.data).filter(([k]) => fields.length == 0 || fields.includes(k))), errors: null };
    };
    const errors = prefixSchemaToErrors(result.error.issues, value);
    const issues = Object.fromEntries(Object.entries(errors).filter(([key]) => fields.length == 0 || fields.includes(key)));
    return {
        parsed: null,
        errors: {
            form: issues,
            fields: issues,
        }
    };
};



function buildChildIndex(formData: FormData): Map<string, Set<string>> {
    const index = new Map<string, Set<string>>();
    for (const key of formData.keys()) {
        const parts = key.split(".");
        for (let i = 0; i < parts.length - 1; i++) {
            const parent = parts.slice(0, i + 1).join(".");
            const child = parts[i + 1]!;
            let set = index.get(parent);
            if (!set) {
                set = new Set();
                index.set(parent, set);
            }
            set.add(child);
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
        Any2FormData(value, `${parentKey}.${key}`, result);
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
                .map((i) => deserialize(formData, `${parentKey}.${i}`, index));
        }
        return Object.fromEntries(
            childKeys.map((key) => [key, deserialize(formData, `${parentKey}.${key}`, index)])
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
