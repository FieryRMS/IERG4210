import React, { useEffect, useState } from "react";
import { Skeleton } from "../ui/skeleton";
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
                {...props}
                onLoad={(e) => {
                    setLoaded(true);
                    onLoad?.(e);
                }}
                style={!showSkeleton ? {} : { display: "none" }}
            />
        </>
    );
}
