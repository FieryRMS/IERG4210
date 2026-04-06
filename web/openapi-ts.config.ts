import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
    input: './openapi.json',
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