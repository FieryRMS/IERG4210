import type { LocationState } from "@/types";
import { Link as RouterLink } from "react-router";

export function Link({
    state,
    ...props
}: { state?: LocationState } & Omit<React.ComponentProps<typeof RouterLink>, "state">) {
    return <RouterLink {...props} state={state} />;
}
