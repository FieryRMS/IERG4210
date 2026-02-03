import type { LocationState, PageHandle } from "@/types";
import { Link as RouterLink, useLocation, useMatches, type Location, type UIMatch } from "react-router";

export function Link({
    state,
    ...props
}: { state?: LocationState } & Omit<React.ComponentProps<typeof RouterLink>, "state">) {
    const location: Location<LocationState> = useLocation();
    const matches = useMatches();
    let breadcrumbs = (matches as UIMatch<unknown, PageHandle>[])
        .filter((match) => match.handle && match.handle.breadcrumb)
        .map((match) => match.handle!.breadcrumb!(match))
        .slice(1);
    state = {
        breadcrumbs: [...(location.state?.breadcrumbs || []), ...breadcrumbs],
        ...state,
    };
    return <RouterLink {...props} state={state} />;
}
