import { fileStorage } from "@/storage";
import type { Route } from "./+types/uploads.$uuid";
import sharp from "sharp";
import { ServerNotFoundException } from "@/lib/errors";

export async function loader({ params, request }: Route.LoaderArgs) {
    const param = new URL(request.url).searchParams.get("resize");
    const parsed = param === "" ? 0.8 : param === null ? null : +param;
    // clamps and defaults to 0.8 if invalid
    const resize = parsed == null ? null : Math.max(0.1, Math.min(1, isNaN(parsed) ? 0.8 : parsed));
    const storageKey = params.uuid;
    const file = await fileStorage.get(`/uploads/${storageKey}`);

    if (!file) {
        throw new ServerNotFoundException().toResponse();
    }

    if (resize) {
        const image = sharp(await file.arrayBuffer());
        const metadata = await image.metadata();

        const resizeBuffer = await sharp(await file.arrayBuffer())
            .resize(Math.round(metadata.width * resize), Math.round(metadata.height * resize), {
                fit: "inside",
            })
            .toBuffer();
        return new Response(resizeBuffer as BodyInit, {
            headers: {
                "Content-Type": file.type,
                "Content-Disposition": `attachment; filename="${file.name}"`,
            },
        });
    }

    return new Response(file.stream(), {
        headers: {
            "Content-Type": file.type,
            "Content-Disposition": `attachment; filename="${file.name}"`,
        },
    });
}
