import type { ParseFormDataOptions } from "@remix-run/form-data-parser";

export const fileStorageConfig: ParseFormDataOptions = {
    maxFileSize: 1024 * 1024 * 10, // 10MB
    maxFiles: 1,
};

export const UPLOAD_URL = "/uploads/";