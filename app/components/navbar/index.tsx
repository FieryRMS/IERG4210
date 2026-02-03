"use client";

import * as React from "react";
import { useLocation, useMatches, type Location, type UIMatch } from "react-router";
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
import { Moon, ShoppingCart, Sun, UserRound, ChevronsRightIcon, SearchIcon, HomeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/hooks/theme-provider";
import { LoginForm } from "./login-form";
import { Badge } from "@/components/ui/badge";
import { ButtonGroup } from "@/components/ui/button-group";
import type { LocationState, PageHandle } from "@/types";
import { useCart } from "@/hooks/cart-provider";

export function Navbar() {
    const { toggleTheme } = useTheme();
    const location: Location<LocationState> = useLocation();
    let breadcrumbs = (useMatches() as UIMatch<unknown, PageHandle>[])
        .filter((match) => match.handle && match.handle.breadcrumb)
        .map((match) => match.handle!.breadcrumb!(match));
    if (location.state?.breadcrumbs?.length) breadcrumbs.slice(1);
    breadcrumbs = [...(location.state?.breadcrumbs || []), ...breadcrumbs];

    const { cart } = useCart();

    return (
        <NavigationMenu className="max-w-full grid w-full grid-cols-3 items-center gap-x-2 px-4 py-2 sticky top-0">
            <NavigationMenuList className="flex justify-start items-center h-full">
                <NavigationMenuItem className="h-full">
                    <NavigationMenuLink
                        render={
                            <Link
                                to="/"
                                className="flex items-center gap-2 h-full justify-center"
                                viewTransition
                                state={{ breadcrumbs: [] }}
                            >
                                <div className="flex items-center justify-center rounded-full p-2 bg-primary text-primary-foreground font-bold">
                                    LOGO
                                </div>
                            </Link>
                        }
                    />
                </NavigationMenuItem>
                <NavigationMenuItem className="h-full">
                    <NavigationMenuTrigger className="h-full px-2">Shop</NavigationMenuTrigger>
                    <NavigationMenuContent>
                        <ul className="grid w-75 gap-3 p-4 md:w-100 md:grid-cols-2 list-none">
                            <ListItem title="New Arrivals" href="/new">
                                Fresh drops and the latest products.
                            </ListItem>
                            <ListItem title="Best Sellers" href="/best-sellers">
                                Customer favorites and top-rated picks.
                            </ListItem>
                            <ListItem title="Men" href="/men">
                                Clothing, shoes, and accessories for men.
                            </ListItem>
                            <ListItem title="Women" href="/women">
                                Styles, outfits, and essentials for women.
                            </ListItem>
                        </ul>
                    </NavigationMenuContent>
                </NavigationMenuItem>

                <NavigationMenuItem className="hidden lg:block h-full">
                    <NavigationMenuLink
                        render={
                            <Link to="/deals" className="text-sm font-medium h-full justify-center" viewTransition>
                                Deals
                            </Link>
                        }
                    />
                </NavigationMenuItem>

                <NavigationMenuItem className="hidden lg:block h-full">
                    <NavigationMenuLink
                        render={
                            <Link
                                to="/collections"
                                className="text-sm font-medium h-full justify-center"
                                viewTransition
                            >
                                Collections
                            </Link>
                        }
                    />
                </NavigationMenuItem>
            </NavigationMenuList>

            <NavigationMenuList className="flex flex-col gap-2 justify-center items-center h-full">
                <NavigationMenuItem className="w-full max-w-md">
                    <form
                        className="flex w-full items-center gap-2 justify-center "
                        onSubmit={(e) => {
                            e.preventDefault();
                            // TODO: search logic
                        }}
                    >
                        <ButtonGroup className="flex-1">
                            <Input placeholder="Search..." />
                            <Button variant="outline" aria-label="Search" type="submit">
                                <SearchIcon />
                            </Button>
                        </ButtonGroup>
                    </form>
                </NavigationMenuItem>
            </NavigationMenuList>

            <NavigationMenuList className="flex justify-end items-center h-full">
                <NavigationMenuItem className=" min-w-fit h-full flex flex-col items-center justify-center">
                    <Button variant="outline" size="icon-lg" onClick={toggleTheme} className="relative">
                        <Sun className="scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
                        <Moon className="absolute scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
                        <span className="sr-only">Toggle theme</span>
                    </Button>
                </NavigationMenuItem>

                <NavigationMenuItem className="hidden md:flex h-full">
                    <NavigationMenuTrigger className="hide-lucide-chevron-down min-w-fit h-full flex flex-col items-center justify-center px-2">
                        <UserRound />
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                        <LoginForm />
                    </NavigationMenuContent>
                </NavigationMenuItem>

                <NavigationMenuItem>
                    {/* TODO: cart logic, use "item" */}
                    <NavigationMenuTrigger className="hide-lucide-chevron-down min-w-fit h-full flex flex-col items-center justify-center px-2">
                        <div className="relative flex flex-col items-center">
                            <div className="relative flex items-center">
                                <ShoppingCart />
                                <Badge className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 h-5 min-w-5 p-0 px-0.5 rounded-full empty:h-2.5 empty:min-w-2.5">
                                    {cart.size}
                                </Badge>
                            </div>
                            <span className="text-xs font-medium text-muted-foreground mt-1">
                                $
                                {[...cart.values()]
                                    .reduce((total, item) => total + item.p.price * item.q, 0)
                                    .toFixed(2)}
                            </span>
                        </div>
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                        <div className="w-65 p-4 space-y-3 text-sm">
                            <p className="font-medium">Your cart</p>
                            <p className="text-muted-foreground">
                                You have {cart.size} items in your cart. Proceed to checkout to complete your order.
                            </p>
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm">
                                    <Link to="/cart" viewTransition>
                                        View cart
                                    </Link>
                                </Button>
                                <Button size="sm">
                                    <Link to="/checkout" viewTransition>
                                        Checkout
                                    </Link>
                                </Button>
                            </div>
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
                                                            {breadcrumb.id === "root" ? (
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
                                                {breadcrumb.id === "root" ? (
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
