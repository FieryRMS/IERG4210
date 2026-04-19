import type { Role } from "./lib/generated/types.gen";

export interface UploadConfig {
    type: RegExp;
    path: RegExp;
    methods: RegExp;
    fields: string[];
    maxFileSize: number;
    maxFiles: number;
    roles?: Role[];
}

export const uploadConfigs: UploadConfig[] = [
    {
        type: /^image\//,
        path: /^\/image\/?/,
        methods: /^POST|PUT|PATCH$/i,
        fields: ["root.url"],
        maxFileSize: 1024 * 1024 * 10, // 10MB
        maxFiles: 1,
    }
];

export const getConfig = (path: string, method: string): UploadConfig | undefined => {
    for (const config of uploadConfigs) {
        if (config.path.test(path) && config.methods.test(method)) return config;
    }
    return undefined;
};

export const UPLOAD_URL = "/uploads/";