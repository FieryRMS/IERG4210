import { createFsFileStorage } from "@remix-run/file-storage/fs";
import type { ParseFormDataOptions } from "@remix-run/form-data-parser";

import { randomUUID } from "node:crypto";

export const fileStorage = createFsFileStorage(
    "./uploads/",
);

export function getStorageKey() {
    return `/uploads/${randomUUID()}`;
}

export const fileStorageConfig: ParseFormDataOptions = {
    maxFileSize: 1024 * 1024 * 10, // 10MB
    maxFiles: 1,
};