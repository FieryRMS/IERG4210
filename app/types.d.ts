interface PageHandle {
    breadcrumb?: (match: UIMatch<unknown, PageHandle>) => React.ReactNode;
}

interface Product {
    id: string;
    name: string;
    imageUrl: string;
    desc: string;
    price: number;
}
