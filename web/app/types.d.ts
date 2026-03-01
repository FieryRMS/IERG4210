import type { UIMatch } from "react-router";
import type { components } from "@/lib/api";
interface Breadcrumb {
    name: string;
    pathname: string;
    id: string;
}

interface PageHandle {
    breadcrumb?: (match: UIMatch<unknown, PageHandle>) => Breadcrumb;
}

type Product = components["schemas"]["Product"];

interface LocationState {
    product?: Product;
    breadcrumbs?: Breadcrumb[];
}
