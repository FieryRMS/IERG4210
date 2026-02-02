import { Separator } from "@/components/ui/separator";
import { Link } from "react-router";

export function Footer() {
    return (
        <>
            <Separator className="my-4" />
            <div className="w-full flex justify-center items-center flex-col">
                <div>© {new Date().getFullYear()} The Generic Company</div>
                <div>Made with hate ❤️</div>
                <Link to="https://github.com/FieryRMS">FieryRMS@GitHub</Link>
            </div>
        </>
    );
}
