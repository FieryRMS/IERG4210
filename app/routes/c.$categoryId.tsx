import { PascalCase } from "@/lib/utils";
import type { PageHandle } from "@/types";

import { clientLoader, meta } from "./_index";
import MainPage from "./_index";

export { clientLoader, meta };
export default MainPage;

export const handle: PageHandle = {
    breadcrumb: ({ params, id, pathname }) => ({
        id,
        name: params.categoryId ? PascalCase(params.categoryId.replace(/[^a-zA-Z0-9]+/g, " ")) : "Unknown Category",
        pathname,
    }),
};
