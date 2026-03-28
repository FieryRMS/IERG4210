import type { UIMatch } from "react-router";
interface Breadcrumb {
    pathname: string;
    name: string;
};
interface PageHandle<T = unknown> {
    breadcrumb?: (match: UIMatch<T, PageHandle>) => Breadcrumb;
}

interface LocationState {
    breadcrumbs?: Breadcrumb[];
}
