import React from "react";
import { Skeleton } from "../ui/skeleton";
import { useState } from "react";
export function Img({ onLoad, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) {
    const [loaded, setLoaded] = useState(false);
    if (props.src === "") props.src = undefined;
    return (
        <>
            {!loaded && <Skeleton {...props} />}
            <img
                {...props}
                onLoad={(e) => {
                    setLoaded(true);
                    onLoad?.(e);
                }}
                style={loaded ? {} : { display: "none" }}
            />
        </>
    );
}
