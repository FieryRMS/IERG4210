interface ViteTypeOptions {
    strictImportMetaEnv: unknown;
}

interface ImportMetaEnv {
    readonly VITE_clientId: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
