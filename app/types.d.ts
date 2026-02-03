import type { UIMatch } from "react-router";

interface Breadcrumb {
    name: string;
    pathname: string;
    id: string;
}

interface PageHandle {
    breadcrumb?: (match: UIMatch<unknown, PageHandle>) => Breadcrumb;
}

interface Product {
    id: string;
    name: string;
    imageUrl: string;
    desc: string;
    price: number;
}

interface LocationState {
    product?: Product;
    breadcrumbs?: Breadcrumb[];
}
