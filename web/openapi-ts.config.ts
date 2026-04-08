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
            name: "zod",
            "~resolvers": {
                number(ctx) {
                    const { $, symbols, nodes, chain } = ctx;
                    const { z } = symbols;
                    const constNode = nodes.const(ctx);
                    if (constNode) {
                        chain.current = constNode;
                        return chain.current;
                    }
                    chain.current = $(z).attr('coerce').attr('number').call();
                    const minNode = nodes.min(ctx);
                    if (minNode) chain.current = minNode;
                    const maxNode = nodes.max(ctx);
                    if (maxNode) chain.current = maxNode;
                    return chain.current;
                }
            }
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