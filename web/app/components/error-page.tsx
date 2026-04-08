import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Link } from "react-router";
import { HomeIcon, TriangleAlertIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorPageProps {
    code?: number | string;
    title?: string;
    description?: string;
    stack?: string;
}

export function ErrorPage({ code = 500, title = "Something went wrong", description = "An unexpected error occurred.", stack }: ErrorPageProps) {
    const is404 = code === 404 || code === "404";

    return (
        <div className="flex items-center justify-center h-full px-4 py-12">
            <Empty className="border-none max-w-lg gap-8">
                <EmptyMedia>
                    <span className={cn(
                        "font-black tracking-tighter select-none tabular-nums leading-none",
                        is404
                            ? "text-9xl text-foreground/10"
                            : "text-8xl text-destructive/15"
                    )}>
                        {code}
                    </span>
                </EmptyMedia>

                <EmptyHeader>
                    {!is404 && (
                        <TriangleAlertIcon className="size-8 text-destructive/60 mb-1" />
                    )}
                    <EmptyTitle className="text-2xl font-semibold">{title}</EmptyTitle>
                    <EmptyDescription>{description}</EmptyDescription>
                </EmptyHeader>

                <EmptyContent>
                    <Separator className="w-16" />
                    <div className="flex gap-3">
                        <Link to="/" className={buttonVariants({ variant: "default" })}>
                            <HomeIcon />
                            Go home
                        </Link>
                    </div>
                </EmptyContent>

                {stack && (
                    <div className="w-full max-w-2xl mt-2">
                        <div className="rounded-lg border bg-muted/50 overflow-hidden">
                            <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted text-muted-foreground text-xs font-mono">
                                <span className="size-2.5 rounded-full bg-destructive/60 shrink-0" />
                                Stack trace
                            </div>
                            <pre className="p-4 text-xs font-mono text-muted-foreground overflow-x-auto leading-relaxed whitespace-pre-wrap break-all">
                                {stack}
                            </pre>
                        </div>
                    </div>
                )}
            </Empty>
        </div>
    );
}
