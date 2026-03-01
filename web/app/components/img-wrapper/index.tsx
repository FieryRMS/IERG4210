import React, { useState } from "react";
import { Skeleton } from "../ui/skeleton";
export function Img({ onLoad, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) {
    if (props.src === "") props.src = undefined;
    const [src, setSrc] = useState<string | undefined>(undefined);
    const showSkeleton = props.src === undefined || props.src !== src;
    return (
        <>
            {showSkeleton && <Skeleton {...props} />}
            <img
                {...props}
                onLoad={(e) => {
                    setSrc(props.src);
                    onLoad?.(e);
                }}
                style={!showSkeleton ? {} : { display: "none" }}
            />
        </>
    );
}
