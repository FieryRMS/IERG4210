import { ServerNotFoundException } from "@/lib/errors";

export function loader() {
    throw new ServerNotFoundException().toResponse();
}

export default function NotFoundPage() {}
