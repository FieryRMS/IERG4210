import { createFsFileStorage } from "@remix-run/file-storage/fs";
import { UPLOAD_URL } from "./config";
import { randomUUID } from "node:crypto";

export const fileStorage = createFsFileStorage(
    `${UPLOAD_URL}`,
);

export function getStorageKey() {
    return `${UPLOAD_URL}${randomUUID()}`;
}