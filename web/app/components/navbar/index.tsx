import * as React from "react";
import { useLocation, useMatches, useNavigate, type Location, type UIMatch } from "react-router";
import { Link } from "@/components/link-wrapper";
import {
    NavigationMenu,
    NavigationMenuContent,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    NavigationMenuTrigger,
    NavigationMenuPositioner,
    NavigationMenuPopup,
} from "@/components/ui/navigation-menu";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Moon, ShoppingCart, Sun, UserRound, ChevronsRightIcon, SearchIcon, HomeIcon, Contrast } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Theme, useTheme } from "@/hooks/theme-provider";
import { NavLoginForm } from "./login-form";
import { Badge } from "@/components/ui/badge";
import { ButtonGroup } from "@/components/ui/button-group";
import type { LocationState, PageHandle } from "@/types";
import type { Category } from "@/lib/generated/types.gen";
import { useCart } from "@/hooks/cart-provider";
import { CartContents } from "@/components/cart";
import { cn } from "@/lib/utils";

export function Navbar({ categories }: { categories: Category[] }) {
    const { theme, toggleTheme } = useTheme();
    const location: Location<LocationState> = useLocation();
    let breadcrumbs = (useMatches() as UIMatch<unknown, PageHandle>[])
        .filter((match) => match.handle && match.handle.breadcrumb)
        .map((match) => match.handle!.breadcrumb!(match));

    const root = breadcrumbs.shift();
    breadcrumbs = [...(location.state?.breadcrumbs || []), ...breadcrumbs];
    if (!location.state?.breadcrumbs?.length || location.state.breadcrumbs[0]?.pathname !== "/")
        breadcrumbs.unshift(root!);

    const { cart, clearCart, setQuantity } = useCart();

    return (
        <NavigationMenu className="max-w-full grid w-full grid-cols-3 items-center gap-x-2 px-4 py-2 sticky top-0">
            <NavigationMenuList className="flex justify-start items-center h-full">
                <NavigationMenuItem className="h-full">
                    <Logo className="hidden md:flex" />
                </NavigationMenuItem>
                <NavigationMenuItem className="h-full md:hidden">
                    <NavigationMenuTrigger className="h-full px-2 flex hide-lucide-chevron-down">
                        <SearchIcon />
                    </NavigationMenuTrigger>
                    <NavigationMenuContent className="w-sm sm:w-sm lg:w-md">
                        <SearchBar />
                    </NavigationMenuContent>
                </NavigationMenuItem>
                <NavigationMenuItem className="h-full">
                    <NavigationMenuTrigger className="h-full px-2">Shop</NavigationMenuTrigger>
                    <NavigationMenuContent className="w-sm sm:w-sm lg:w-md">
                        <ul className="grid gap-3 p-1 md:w-100 md:grid-cols-2 list-none w-full">
                            {categories.map((category) => (
                                <ListItem key={category.id} title={category.name} href={`/c/${category.id}`}>
                                    {category.description}
                                </ListItem>
                            ))}
                        </ul>
                    </NavigationMenuContent>
                </NavigationMenuItem>
            </NavigationMenuList>

            <NavigationMenuList className="flex flex-col gap-2 justify-center items-center h-full">
                <SearchBar className="hidden md:flex" />
                <Logo className="md:hidden" />
            </NavigationMenuList>

            <NavigationMenuList className="flex justify-end items-center h-full">
                <NavigationMenuItem className=" min-w-fit h-full flex flex-col items-center justify-center">
                    <Button variant="outline" size="icon-lg" onClick={toggleTheme} className="relative">
                        <Sun
                            className={
                                "transition-all " + (theme == Theme.Light ? "scale-100 rotate-0" : "scale-0 -rotate-90")
                            }
                        />
                        <Moon
                            className={
                                "transition-all absolute " +
                                (theme == Theme.Dark ? "scale-100 rotate-0" : "scale-0 rotate-90")
                            }
                        />
                        <Contrast
                            className={
                                "transition-all absolute " +
                                (theme == Theme.System ? "scale-100 rotate-0" : "scale-0 rotate-90")
                            }
                        />
                        <span className="sr-only">Toggle theme</span>
                    </Button>
                </NavigationMenuItem>

                <NavigationMenuItem className="flex h-full">
                    <NavigationMenuTrigger className="hide-lucide-chevron-down min-w-fit h-full flex flex-col items-center justify-center px-2">
                        <UserRound />
                    </NavigationMenuTrigger>
                    <NavigationMenuContent className="w-sm sm:w-sm lg:w-md">
                        <NavLoginForm />
                    </NavigationMenuContent>
                </NavigationMenuItem>

                <NavigationMenuItem>
                    <NavigationMenuTrigger className="hide-lucide-chevron-down min-w-fit h-full flex flex-col items-center justify-center px-2">
                        <div className="relative flex flex-col items-center">
                            <div className="relative flex items-center">
                                <ShoppingCart />
                                <Badge className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 h-5 min-w-5 p-0 px-0.5 rounded-full empty:h-2.5 empty:min-w-2.5">
                                    {Object.keys(cart?.products || {}).length}
                                </Badge>
                            </div>
                            <span className="text-xs font-medium text-muted-foreground mt-1">
                                $
                                {Object.values(cart?.products || {})
                                    .reduce((total, item) => total + item.p.price * item.q, 0)
                                    .toFixed(2)}
                            </span>
                        </div>
                    </NavigationMenuTrigger>
                    <NavigationMenuContent className="w-sm sm:w-sm lg:w-md">
                        <div className="p-2">
                            <CartContents
                                variantItemMedia="image"
                                cart={cart}
                                setQuantity={setQuantity}
                                clearCart={clearCart}
                            >
                                <Link to="/checkout" viewTransition>
                                    <Button className="w-full mt-1">Checkout</Button>
                                </Link>
                            </CartContents>
                        </div>
                    </NavigationMenuContent>
                </NavigationMenuItem>
            </NavigationMenuList>
            <NavigationMenuPositioner>
                <NavigationMenuPopup />
            </NavigationMenuPositioner>
            {breadcrumbs.length > 0 && (
                <div className="flex flex-col gap-8 col-span-3 justify-center items-center">
                    <Breadcrumb>
                        <BreadcrumbList>
                            {breadcrumbs.map((breadcrumb, i) => (
                                <React.Fragment key={i}>
                                    {i < breadcrumbs.length - 1 ? (
                                        <>
                                            <BreadcrumbItem>
                                                <BreadcrumbLink
                                                    render={
                                                        <Link
                                                            to={breadcrumb.pathname}
                                                            viewTransition
                                                            state={{
                                                                breadcrumbs: breadcrumbs.slice(0, i),
                                                            }}
                                                        >
                                                            {breadcrumb.pathname === "/" ? (
                                                                <HomeIcon className="size-4" />
                                                            ) : (
                                                                breadcrumb.name
                                                            )}
                                                        </Link>
                                                    }
                                                />
                                            </BreadcrumbItem>
                                            <BreadcrumbSeparator>
                                                <ChevronsRightIcon />
                                            </BreadcrumbSeparator>
                                        </>
                                    ) : (
                                        <BreadcrumbItem>
                                            <BreadcrumbPage>
                                                {breadcrumb.pathname === "/" ? (
                                                    <HomeIcon className="size-4" />
                                                ) : (
                                                    breadcrumb.name
                                                )}
                                            </BreadcrumbPage>
                                        </BreadcrumbItem>
                                    )}
                                </React.Fragment>
                            ))}
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>
            )}
        </NavigationMenu>
    );
}

function ListItem({ title, children, href, ...props }: React.ComponentPropsWithoutRef<"li"> & { href: string }) {
    return (
        <li {...props}>
            <NavigationMenuLink
                render={
                    <Link to={href} viewTransition>
                        <div className="flex flex-col gap-1 text-sm">
                            <div className="leading-none font-medium">{title}</div>
                            <div className="text-muted-foreground line-clamp-2">{children}</div>
                        </div>
                    </Link>
                }
            />
        </li>
    );
}

function SearchBar({ className }: { className?: string }) {
    const navigate = useNavigate();
    return (
        <form
            className={cn("flex w-full items-center gap-2 justify-center max-w-md", className)}
            onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const query = formData.get("search")?.toString().trim();
                if (query) {
                    navigate(`/p/${query}`, { viewTransition: true });
                }
            }}
        >
            <ButtonGroup className="flex-1 flex items-center justify-center">
                <Input name="search" placeholder="Search..." className="block" />
                <Button variant="outline" aria-label="Search" type="submit">
                    <SearchIcon />
                </Button>
            </ButtonGroup>
        </form>
    );
}

function Logo({ className }: { className?: string }) {
    return (
        <NavigationMenuLink
            render={
                <Link
                    to="/"
                    className={cn("flex items-center gap-2 h-full justify-center", className)}
                    viewTransition
                    state={{ breadcrumbs: [] }}
                >
                    <div className="flex items-center justify-center rounded-full p-2 bg-primary text-primary-foreground font-bold">
                        LOGO
                    </div>
                </Link>
            }
        />
    );
}
