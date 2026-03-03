import type { UIMatch } from "react-router";
import type { components } from "@/lib/api";


// type Breadcrumb = ({ type: "Category"; } & Category | { type: "Product"; } & Product);
interface Breadcrumb { 
    pathname: string;
};
interface PageHandle {
    breadcrumb?: (match: UIMatch<unknown, PageHandle>) => Breadcrumb;
}

type Product = components["schemas"]["Product"];
type Category = components["schemas"]["Category"];

interface LocationState {
    breadcrumbs?: Breadcrumb[];
}
