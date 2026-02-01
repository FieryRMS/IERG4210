"use client";

import * as React from "react";
import { Link } from "react-router";
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
import { Moon, Search, ShoppingCart, Sun, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/components/theme-provider";
import { LoginForm } from "./login-form";

export function NavBar() {
    const { toggleTheme } = useTheme();

    return (
        <NavigationMenu className="max-w-full grid w-full grid-cols-3 items-center gap-4 px-4 py-2">
            <NavigationMenuList className="flex justify-start items-center">
                <NavigationMenuItem>
                    <NavigationMenuLink
                        render={
                            <Link to="/" className="flex items-center gap-2">
                                <div className="flex items-center justify-center rounded-full p-2 bg-primary text-primary-foreground font-bold">
                                    LOGO
                                </div>
                            </Link>
                        }
                    />
                </NavigationMenuItem>
                <NavigationMenuItem>
                    <NavigationMenuTrigger>Shop</NavigationMenuTrigger>
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

                <NavigationMenuItem className="hidden lg:block">
                    <NavigationMenuLink
                        render={
                            <Link to="/deals" className="text-sm font-medium">
                                Deals
                            </Link>
                        }
                    />
                </NavigationMenuItem>

                <NavigationMenuItem className="hidden lg:block">
                    <NavigationMenuLink
                        render={
                            <Link to="/collections" className="text-sm font-medium">
                                Collections
                            </Link>
                        }
                    />
                </NavigationMenuItem>
            </NavigationMenuList>

            {/* Center: logo + search */}
            <NavigationMenuList className="flex flex-col gap-2 justify-center items-center">
                <NavigationMenuItem className="w-full max-w-md">
                    <form
                        className="flex w-full items-center gap-2"
                        onSubmit={(e) => {
                            e.preventDefault();
                            // hook this up to your search logic
                        }}
                    >
                        <div className="relative flex-1">
                            <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input type="search" placeholder="Search..." className="pl-8" />
                        </div>
                    </form>
                </NavigationMenuItem>
            </NavigationMenuList>

            {/* Right: theme, account, cart */}
            <NavigationMenuList className="flex justify-end items-center">
                <NavigationMenuItem>
                    <Button variant="outline" size="icon" onClick={toggleTheme} className="relative">
                        <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
                        <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
                        <span className="sr-only">Toggle theme</span>
                    </Button>
                </NavigationMenuItem>

                <NavigationMenuItem className="hidden md:flex hide-lucide-chevron-down">
                    <NavigationMenuTrigger>
                        <UserRound />
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                        <LoginForm />
                    </NavigationMenuContent>
                </NavigationMenuItem>

                <NavigationMenuItem>
                    <NavigationMenuTrigger className="hide-lucide-chevron-down">
                        <div className="relative flex items-center gap-1">
                            <ShoppingCart className="h-5 w-5" />
                            <span className="hidden text-sm font-medium md:inline">Cart</span>{" "}
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[0.7rem] font-semibold text-primary-foreground">
                                3
                            </span>
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
