import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
    input: process.env.EXE_MODE === "dev" ? 'http://localhost:8000/openapi.json' : './openapi.json',
    output: {
        path: 'app/lib/generated',
        entryFile: false,
    },
    plugins: [
        {
            name: "@hey-api/client-fetch",
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