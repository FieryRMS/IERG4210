"use client";

import type { Route } from "./+types/me";
import type { PageHandle } from "@/types";
import { Link, redirect } from "react-router";
import { useAuth } from "@/hooks/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ShoppingCart, User as UserIcon, Settings, CalendarDays, Mail, Shield, Trash2, Monitor, MapPin, Clock } from "lucide-react";
import { AuthForm } from "@/components/navbar/login-form";
import React, { useState } from "react";
import { UserContext } from "@/lib/security.server";
import { getAuth } from "@/lib/server.utils";
import { sdk } from "@/lib/utils";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import type { Session } from "@/lib/generated/types.gen";

export const handle: PageHandle<Route.ComponentProps["loaderData"]> = {
    breadcrumb: () => ({ pathname: "/me", name: "My Account" }),
};

export function meta() {
    return [{ title: "My Account | The Generic Company" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
    const user = context.get(UserContext);
    if (!user) throw redirect("/");

    const auth = await getAuth(request);
    const { request: _orq, response: _ors, ...orders } = await sdk.orders.getOrdersMe(auth);
    return { orders };
}

export default function MePage({ loaderData }: Route.ComponentProps) {
    const { setUser, ...temp } = useAuth();
    const user = temp.user!;
    const [sessions, setSessions] = useState<Session[]>(user.sessions ?? []);

    const initials = user.username
        .split(/\s+/)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    const joinedDate = user.created_at
        ? new Date(user.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
        : null;

    return (
        <main className="container mx-auto px-4 py-10">
            <Tabs defaultValue="profile">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
                    <Avatar className="size-16 text-xl bg-primary text-primary-foreground">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-2xl font-bold truncate">{user.username}</h1>
                            <Badge variant={user.role === "admin" ? "destructive" : "secondary"}>{user.role}</Badge>
                        </div>
                        <p className="text-muted-foreground text-sm truncate">{user.email}</p>
                    </div>
                    <TabsList className="self-start sm:self-auto">
                        <TabsTrigger value="profile">
                            <UserIcon className="size-4 mr-1" />
                            Profile
                        </TabsTrigger>
                        <TabsTrigger value="orders">
                            <ShoppingCart className="size-4 mr-1" />
                            Orders
                        </TabsTrigger>
                        <TabsTrigger value="settings">
                            <Settings className="size-4 mr-1" />
                            Settings
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* Profile Tab */}
                <TabsContent value="profile">
                    <Card>
                        <CardHeader>
                            <CardTitle>Account Details</CardTitle>
                            <CardDescription>Your personal information.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <InfoRow
                                    icon={<UserIcon className="size-4" />}
                                    label="Username"
                                    value={user.username}
                                />
                                <InfoRow icon={<Mail className="size-4" />} label="Email" value={user.email} />
                                <InfoRow
                                    icon={<Shield className="size-4" />}
                                    label="Role"
                                    value={user.role ?? "user"}
                                />
                                {joinedDate && (
                                    <InfoRow
                                        icon={<CalendarDays className="size-4" />}
                                        label="Member since"
                                        value={joinedDate}
                                    />
                                )}
                            </div>

                            {sessions.length > 0 && (
                                <>
                                    <Separator />
                                    <div>
                                        <p className="text-sm font-medium mb-3">
                                            Active Sessions
                                            <span className="ml-2 text-xs font-normal text-muted-foreground">
                                                ({sessions.length})
                                            </span>
                                        </p>
                                        <SessionsTable
                                            sessions={sessions}
                                            onDelete={async (id) => {
                                                const { error } = await sdk.users.deleteUsersMeSessionsById({
                                                    path: { id },
                                                });
                                                if (error) {
                                                    toast.error("Failed to revoke session.");
                                                    return;
                                                }
                                                setSessions((prev) => prev.filter((s) => s.id !== id));
                                                toast.success("Session revoked.");
                                            }}
                                        />
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Orders Tab */}
                <TabsContent value="orders">
                    <Card>
                        <CardHeader>
                            <CardTitle>Orders</CardTitle>
                            <CardDescription>Manage your orders.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loaderData.orders.data ? (
                                <ItemGroup className="gap-4">
                                    {loaderData.orders.data.length === 0 && (
                                        <div className="flex flex-col items-center gap-4 py-10 text-muted-foreground">
                                            <ShoppingCart className="size-12 opacity-30" />
                                            <p className="text-sm">You have no orders yet.</p>
                                        </div>
                                    )}
                                    {loaderData.orders.data.map((order) => (
                                        <Item variant="outline" key={order.id}>
                                            <ItemMedia variant="default" className="self-center! translate-y-0!">
                                                {order.paid ? (
                                                    <Badge
                                                        variant="secondary"
                                                        className="bg-blue-500 text-white dark:bg-blue-600"
                                                    >
                                                        Paid
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="destructive">Unpaid</Badge>
                                                )}
                                            </ItemMedia>
                                            <ItemContent>
                                                <ItemTitle>
                                                    {new Date(order.created_at!).toLocaleString()} -{" "}
                                                    {order.products.length} item(s) - {order.price.toFixed(2)}{" "}
                                                    {order.currency!.toUpperCase()}
                                                </ItemTitle>
                                                <ItemDescription>{order.id}</ItemDescription>
                                            </ItemContent>
                                            <ItemActions>
                                                <Link to={`/checkout/${order.id}`}>
                                                    <Button variant="outline">
                                                        <ShoppingCart />
                                                    </Button>
                                                </Link>
                                            </ItemActions>
                                        </Item>
                                    ))}
                                </ItemGroup>
                            ) : (
                                <div className="flex flex-col items-center gap-4 py-10 text-muted-foreground">
                                    <ShoppingCart className="size-12 opacity-30" />
                                    <p className="text-sm">You have no orders yet.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Settings Tab */}
                <TabsContent value="settings">
                    <div className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Security</CardTitle>
                                <CardDescription>Manage your password and account security.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Accordion className="w-full space-y-2">
                                    <AccordionItem value="change-password" className="last:border-b border rounded-md">
                                        <AccordionTrigger className="py-3 px-5 text-base items-center">
                                            Change Password
                                        </AccordionTrigger>
                                        <AccordionContent className="flex flex-col gap-4 px-5 pb-4">
                                            <AuthForm type="change" onSuccess={setUser} />
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Danger Zone</CardTitle>
                                <CardDescription>Irreversible account actions.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button variant="destructive" disabled>
                                    Delete Account
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </main>
    );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-start gap-3">
            <div className="mt-0.5 text-muted-foreground">{icon}</div>
            <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-medium truncate">{value}</p>
            </div>
        </div>
    );
}

function SessionsTable({
    sessions,
    onDelete,
}: {
    sessions: Session[];
    onDelete: (id: string) => Promise<void>;
}) {
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        await onDelete(id);
        setDeletingId(null);
    };

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>
                        <span className="flex items-center gap-1.5"><Clock className="size-3.5" />Created</span>
                    </TableHead>
                    <TableHead>
                        <span className="flex items-center gap-1.5"><MapPin className="size-3.5" />Location</span>
                    </TableHead>
                    <TableHead>
                        <span className="flex items-center gap-1.5"><Monitor className="size-3.5" />Device</span>
                    </TableHead>
                    <TableHead />
                </TableRow>
            </TableHeader>
            <TableBody>
                {sessions.map((session) => (
                    <TableRow key={session.id}>
                        <TableCell className="text-muted-foreground text-xs">
                            {session.created_at
                                ? new Date(session.created_at).toLocaleString()
                                : "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                            <div className="flex flex-col gap-0.5 min-w-0">
                                <span className="font-medium">
                                    {session.location ?? "Unknown"}
                                </span>
                                <span className="text-muted-foreground font-mono">
                                    {session.ip_address ?? "Unknown IP"}
                                </span>
                            </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-48">
                            <span className="truncate block" title={session.user_agent ?? undefined}>
                                {session.user_agent ?? "Unknown"}
                            </span>
                        </TableCell>
                        <TableCell>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-7 text-muted-foreground hover:text-destructive"
                                        disabled={deletingId === session.id}
                                    >
                                        <Trash2 className="size-3.5" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Revoke session?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will immediately sign out the device at{" "}
                                            <span className="font-medium text-foreground">
                                                {session.location ?? session.ip_address ?? "unknown location"}
                                            </span>
                                            . This cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            onClick={() => handleDelete(session.id!)}
                                        >
                                            Revoke
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
