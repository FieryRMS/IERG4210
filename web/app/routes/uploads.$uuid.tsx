import { fileStorage } from "@/storage";
import type { Route } from "./+types/uploads.$uuid";

export async function loader({ params }: Route.LoaderArgs) {
    const storageKey = params.uuid;
    const file = await fileStorage.get(`/uploads/${storageKey}`);

    if (!file) {
        throw new Response("Uploaded file not found", {
            status: 404,
        });
    }

    return new Response(file.stream(), {
        headers: {
            "Content-Type": file.type,
            "Content-Disposition": `attachment; filename=${file.name}`,
        },
    });
}
