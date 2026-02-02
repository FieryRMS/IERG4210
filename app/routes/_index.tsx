import { HomeIcon } from "lucide-react";
import type { Route } from "../+types/root";
import { Category } from "@/components/category";

export function meta({}: Route.MetaArgs) {
    return [{ title: "New React Router App" }, { name: "description", content: "Welcome to React Router!" }];
}

export default function Home() {
    return (
        <>
            <Category />
        </>
    );
}

export const handle: PageHandle = {
    breadcrumb: () => <HomeIcon className="size-4" />,
};
