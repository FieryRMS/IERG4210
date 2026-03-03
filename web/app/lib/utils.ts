import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { FormAsyncValidateOrFn, StandardSchemaV1 } from "@tanstack/form-core";
import type { paths } from "./api";
import createClient from "openapi-fetch";

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