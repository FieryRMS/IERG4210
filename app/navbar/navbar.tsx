"use client";

import * as React from "react";
import { Link, useMatches, type UIMatch } from "react-router";
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
import { Moon, Search, ShoppingCart, Sun, HomeIcon, UserRound, ChevronsRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/components/theme-provider";
import { LoginForm } from "./login-form";

export function NavBar() {
    const { toggleTheme } = useTheme();
    const matches = (useMatches() as UIMatch<unknown, PageHandle>[]).filter(
        (match) => match.handle && match.handle.breadcrumb,
    );
    return (
        <NavigationMenu className="max-w-full grid w-full grid-cols-3 items-center gap-x-2 px-4 py-2">
            <NavigationMenuList className="flex justify-start items-center h-full">
                <NavigationMenuItem className="h-full">
                    <NavigationMenuLink
                        render={
                            <Link to="/" className="flex items-center gap-2 h-full justify-center">
                                <div className="flex items-center justify-center rounded-full p-2 bg-primary text-primary-foreground font-bold">
                                    LOGO
                                </div>
                            </Link>
                        }
                    />
                </NavigationMenuItem>
                <NavigationMenuItem className="h-full">
                    <NavigationMenuTrigger className="h-full">Shop</NavigationMenuTrigger>
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
                            <Link to="/deals" className="text-sm font-medium h-full justify-center">
                                Deals
                            </Link>
                        }
                    />
                </NavigationMenuItem>

                <NavigationMenuItem className="hidden lg:block h-full">
                    <NavigationMenuLink
                        render={
                            <Link to="/collections" className="text-sm font-medium h-full justify-center">
                                Collections
                            </Link>
                        }
                    />
                </NavigationMenuItem>
            </NavigationMenuList>

            <NavigationMenuList className="flex flex-col gap-2 justify-center items-center h-full">
                <NavigationMenuItem className="w-full max-w-md">
                    <form
                        className="flex w-full items-center gap-2"
                        onSubmit={(e) => {
                            e.preventDefault();
                            // TODO: search logic
                        }}
                    >
                        <div className="relative flex-1">
                            <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input type="search" placeholder="Search..." className="pl-8" />
                        </div>
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
                    <NavigationMenuTrigger className="hide-lucide-chevron-down min-w-fit h-full flex flex-col items-center justify-center">
                        <UserRound />
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                        <LoginForm />
                    </NavigationMenuContent>
                </NavigationMenuItem>

                <NavigationMenuItem>
                    {/* TODO: cart logic */}
                    <NavigationMenuTrigger className="hide-lucide-chevron-down min-w-fit h-full flex flex-col items-center justify-center">
                        <div className="relative flex flex-col items-center">
                            <div className="relative flex items-center">
                                <ShoppingCart className="h-8 w-8" />
                                <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[0.8rem] font-semibold text-primary-foreground shadow">
                                    3
                                </span>
                            </div>
                            <span className="text-xs font-medium text-muted-foreground mt-1">$123.45</span>
                        </div>
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                        <div className="w-65 p-4 space-y-3 text-sm">
                            <p className="font-medium">Your cart</p>
                            <p className="text-muted-foreground">
                                You have 3 items in your cart. Proceed to checkout to complete your order.
                            </p>
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm">
                                    <Link to="/cart">View cart</Link>
                                </Button>
                                <Button size="sm">
                                    <Link to="/checkout">Checkout</Link>
                                </Button>
                            </div>
                        </div>
                    </NavigationMenuContent>
                </NavigationMenuItem>
            </NavigationMenuList>
            <NavigationMenuPositioner>
                <NavigationMenuPopup />
            </NavigationMenuPositioner>
            {matches.length > 0 && (
                <div className="flex flex-col gap-8 col-span-3 justify-center items-center">
                    <Breadcrumb>
                        <BreadcrumbList>
                            {matches.map((match, index, array) => (
                                <React.Fragment key={index}>
                                    {index < array.length - 1 ? (
                                        <BreadcrumbItem>
                                            <BreadcrumbLink
                                                render={<Link to={match.pathname}>{match.handle!.breadcrumb}</Link>}
                                            />
                                        </BreadcrumbItem>
                                    ) : (
                                        <BreadcrumbItem>
                                            <BreadcrumbPage>{match.handle!.breadcrumb}</BreadcrumbPage>
                                        </BreadcrumbItem>
                                    )}
                                    {index < array.length - 1 && (
                                        <BreadcrumbSeparator>
                                            <ChevronsRightIcon />
                                        </BreadcrumbSeparator>
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
                    <Link to={href}>
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
