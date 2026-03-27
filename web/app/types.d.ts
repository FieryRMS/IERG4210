import type { UIMatch } from "react-router";
import type { components } from "@/lib/api";


interface Breadcrumb {
    pathname: string;
    name: string;
};
interface PageHandle<T = unknown> {
    breadcrumb?: (match: UIMatch<T, PageHandle>) => Breadcrumb;
}

type Product = components["schemas"]["Product"];
type Category = components["schemas"]["Category"];
type Image = components["schemas"]["Image"];
type User = components["schemas"]["User"];

interface LocationState {
    breadcrumbs?: Breadcrumb[];
}
