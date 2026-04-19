interface ViteTypeOptions {
    strictImportMetaEnv: unknown;
}

interface ImportMetaEnv {
    readonly VITE_O_AUTH_CLIENT_ID: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
