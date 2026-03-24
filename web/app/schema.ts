
import { fileStorageConfig, UPLOAD_URL } from "@/config";
import { z } from "zod";

export type SchemaType = string | number | null | File | undefined | (string | number | null)[];

export const baseSchema = z.object({
    id: z.uuidv4().nullable().optional(),
});
export const productSchema = baseSchema.extend({
    name: z.string(),
    description: z.string().nullable(),
    price: z.coerce.number<number>().min(0.01),
    catid: z.uuidv4(),
    images: z.array(z.uuidv4()),
    type: z.literal("Product"),
});

export const categorySchema = baseSchema.extend({
    name: z.string(),
    description: z.string().nullable(),
    type: z.literal("Category"),
});

export const imageSchema = baseSchema.extend({
    url: z.union([
        z.url({
            protocol: /^https?$/,
            hostname: z.regexes.domain,
        }),
        z.string().regex(new RegExp(`^${UPLOAD_URL}`)),
        z.file().max(fileStorageConfig.maxFileSize!),
    ]),
    alt: z.string().nullable().optional(),
    type: z.literal("Image"),
});