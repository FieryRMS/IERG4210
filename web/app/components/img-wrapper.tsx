import React, { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
export function Img({ src, onLoad, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) {
    if (src === "") src = undefined;
    const [currSrc, setSrc] = useState<string | undefined>(undefined);
    const [loaded, setLoaded] = useState(false);
    useEffect(() => {
        if (src !== currSrc) {
            setLoaded(false);
            setSrc(src);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [src]);
    const showSkeleton = src === undefined || src !== currSrc || !loaded;
    return (
        <>
            {showSkeleton && <Skeleton {...props} />}
            <img
                src={currSrc}
                draggable={false}
                {...props}
                className={cn("rounded-md", props.className, showSkeleton && "hidden")}
                onLoad={(e) => {
                    setLoaded(true);
                    onLoad?.(e);
                }}
            />
        </>
    );
}
