import { fileStorage } from "@/storage";
import type { Route } from "./+types/uploads.$uuid";
import sharp from "sharp";
import { ServerNotFoundException } from "@/lib/errors";

export async function loader({ params, request }: Route.LoaderArgs) {
    const thumbnail = new URL(request.url).searchParams.get("thumbnail") === "true";
    const storageKey = params.uuid;
    const file = await fileStorage.get(`/uploads/${storageKey}`);

    if (!file) {
        throw new ServerNotFoundException();
    }

    if (thumbnail) {
        const thumbnailBuffer = await sharp(await file.arrayBuffer())
            .resize(200, 200, {
                fit: "inside",
            })
            .toBuffer();
        return new Response(thumbnailBuffer, {
            headers: {
                "Content-Type": file.type,
                "Content-Disposition": `attachment; filename=${file.name}`,
            },
        });
    }

    return new Response(file.stream(), {
        headers: {
            "Content-Type": file.type,
            "Content-Disposition": `attachment; filename=${file.name}`,
        },
    });
}
