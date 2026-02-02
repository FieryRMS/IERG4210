interface PageHandle {
    breadcrumb?: (match: UIMatch<unknown, PageHandle>) => React.ReactNode;
}
