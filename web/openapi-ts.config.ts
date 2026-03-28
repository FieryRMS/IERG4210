import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
    input: {
        path: process.env.EXE_MODE === "dev" ? 'http://localhost:8000/openapi.json' : '../api/openapi.json',
        watch: process.env.EXE_MODE === "dev",
    },
    output: {
        path: 'app/lib/client',
        entryFile: false,
    },
    plugins: [
        {
            name: "@hey-api/client-fetch",
            baseUrl: process.env.API_URL || "http://localhost:8000",
        },
        {
            name: "@hey-api/sdk",
            auth: true,
            operations: {
                strategy: "single",
                nesting: (operation) => {
                    return [operation.tags?.[0] || "default", operation.id];
                }
            }
        }
    ],
});