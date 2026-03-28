"use client";

import { z } from "zod";
import { useAppForm } from "@/components/ui/form-tanstack";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { onChangeAsync } from "@/lib/utils";
import { useState } from "react";
import { useAuth } from "@/hooks/auth-provider";
import type { User } from "@/lib/client/types.gen";
import { Link } from "react-router";
import { ChevronDown, ChevronUp, LayoutDashboard, LogOut } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

const passwordRules = z
    .string()
    .min(8)
    .max(100)
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[a-z]/, "Must contain at least one lowercase letter")
    .regex(/[0-9]/, "Must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Must contain at least one special character");

export type FormTypes = "login" | "register" | "change";

const schema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("login"),
        username: z.string(),
        password: z.string(),
    }),
    z.object({
        type: z.literal("register"),
        username: z.string().min(2).max(50),
        email: z.email(),
        password: passwordRules,
        confirm_password: z.string().min(8).max(100),
    }),
    z.object({
        type: z.literal("change"),
        old_password: z.string().min(1, "Required"),
        password: passwordRules,
        confirm_password: z.string(),
    }),
]);

export function LoginForm() {
    const { user, setUser } = useAuth();
    const [showChangePassword, setShowChangePassword] = useState(false);

    if (user) {
        const initials = user.username
            .split(/\s+/)
            .map((w) => w[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);

        return (
            <div className="p-4 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                        {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold truncate">{user.username}</p>
                            {user.role === "admin" && <Badge className="text-xs">Admin</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                </div>

                <Separator />

                <div className="space-y-1.5">
                    {user.role === "admin" && (
                        <Link to="/admin">
                            <Button variant="secondary" size="sm" className="w-full justify-start gap-2">
                                <LayoutDashboard className="size-3.5" />
                                Admin Panel
                            </Button>
                        </Link>
                    )}

                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-between"
                        onClick={() => setShowChangePassword((v) => !v)}
                    >
                        <span>Change Password</span>
                        {showChangePassword ? (
                            <ChevronUp className="size-3.5 text-muted-foreground" />
                        ) : (
                            <ChevronDown className="size-3.5 text-muted-foreground" />
                        )}
                    </Button>

                    {showChangePassword && (
                        <div className="rounded-lg border bg-muted/30 p-3">
                            <Form
                                type="change"
                                onSuccess={() => setShowChangePassword(false)}
                                onCancel={() => setShowChangePassword(false)}
                            />
                        </div>
                    )}

                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={async () => {
                            await fetch("/api/users", { method: "DELETE" });
                            setUser(null);
                        }}
                    >
                        <LogOut className="size-3.5" />
                        Sign Out
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            {(["login", "register"] satisfies FormTypes[]).map((t) => (
                <TabsContent key={t} value={t} className="mt-4">
                    <Form type={t} onSuccess={setUser} />
                </TabsContent>
            ))}
        </Tabs>
    );
}

function Form({
    type,
    onSuccess,
    onCancel,
}: {
    type: FormTypes;
    onSuccess?: (user: User | null) => void;
    onCancel?: () => void;
}) {
    const [submitError, setSubmitError] = useState<string | null>(null);
    const fields = schema.options.find((opt) => opt.shape.type.value === type)!.shape;
    const form = useAppForm({
        defaultValues: Object.fromEntries(
            Object.keys(fields).map((key) => (key === "type" ? [key, type] : [key, ""])),
        ) as z.infer<typeof schema>,
        validators: {
            onChangeAsync: onChangeAsync(schema),
            onChangeAsyncDebounceMs: 300,
            onSubmit: schema,
        },
        onSubmit: async ({ value }) => {
            if ((value.type === "register" || value.type === "change") && value.password !== value.confirm_password) {
                setSubmitError("Passwords do not match");
                return;
            }
            setSubmitError(null);
            const response = await fetch("/api/users", {
                method: value.type === "change" ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(value),
            });
            if (response.ok) {
                onSuccess?.(await response.json().catch(() => null));
            } else {
                const error = await response.json().catch(() => null);
                setSubmitError(error?.detail?.[0]?.msg ?? error?.detail ?? `Failed to ${type.toLowerCase()}`);
            }
        },
    });

    const submitLabel = type === "login" ? "Sign In" : type === "register" ? "Create Account" : "Update Password";

    return (
        <form.AppForm>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    form.handleSubmit();
                }}
                className="space-y-3 px-1"
            >
                {Object.keys(fields)
                    .filter((key) => key !== "type")
                    .map((key) => (
                        <form.AppField name={key as keyof typeof fields} key={key}>
                            {(field) => (
                                <form.Item>
                                    <field.Control>
                                        <Input
                                            placeholder={key
                                                .replaceAll("_", " ")
                                                .replace(/\b\w/g, (c) => c.toUpperCase())}
                                            type={
                                                key.includes("password")
                                                    ? "password"
                                                    : key === "email"
                                                      ? "email"
                                                      : "text"
                                            }
                                            autoComplete={
                                                key === "username"
                                                    ? "username"
                                                    : key === "email"
                                                      ? "email"
                                                      : key === "old_password" || type === "login"
                                                        ? "current-password"
                                                        : "new-password"
                                            }
                                            name={field.name}
                                            value={field.state.value}
                                            onBlur={field.handleBlur}
                                            onChange={(e) => field.handleChange(e.target.value)}
                                        />
                                    </field.Control>
                                    <field.Message />
                                </form.Item>
                            )}
                        </form.AppField>
                    ))}
                {submitError && (
                    <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{submitError}</p>
                )}
                <form.Subscribe selector={(state) => state.isSubmitting}>
                    {(isSubmitting) => (
                        <div className={onCancel ? "flex gap-2" : undefined}>
                            <Button type="submit" className={onCancel ? "flex-1" : "w-full"} size="sm" disabled={isSubmitting}>
                                {isSubmitting ? <Spinner /> : submitLabel}
                            </Button>
                            {onCancel && (
                                <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isSubmitting}>
                                    Cancel
                                </Button>
                            )}
                        </div>
                    )}
                </form.Subscribe>
            </form>
        </form.AppForm>
    );
}
