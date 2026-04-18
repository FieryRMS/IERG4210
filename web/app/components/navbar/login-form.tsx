import { z } from "zod";
import { useAppForm } from "@/components/ui/form-tanstack";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { parseWithSchema, sdk } from "@/lib/utils";
import { useState } from "react";
import { useAuth } from "@/hooks/auth";
import type { ServerValidationException, User } from "@/lib/generated/types.gen";
import { Link } from "react-router";
import { LayoutDashboard, LogOut } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "../ui/item";
import { zUserChangePassword, zUserLogin, zUserRegister } from "@/lib/generated/zod.gen";
import { toast } from "sonner";

const schemas = {
    login: zUserLogin,
    register: zUserRegister,
    change: zUserChangePassword,
};
export type AuthFormType = keyof typeof schemas;

export function NavLoginForm() {
    const { user, setUser } = useAuth();

    if (user) {
        const initials = user.username
            .split(/\s+/)
            .map((w) => w[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);

        return (
            <div className="p-2 space-y-4">
                <ItemGroup>
                    <Item variant="outline" render={<Link to="/me" />} role="listitem">
                        <ItemMedia
                            variant="image"
                            className="bg-primary items-center justify-center text-primary-foreground"
                        >
                            {initials}
                        </ItemMedia>
                        <ItemContent>
                            <ItemTitle className="line-clamp-1">{user.username}</ItemTitle>
                            <ItemDescription>{user.email}</ItemDescription>
                        </ItemContent>
                        <ItemContent className="flex-none text-center">
                            <ItemDescription>
                                <Badge variant={user.role === "admin" ? "destructive" : "secondary"}>{user.role}</Badge>
                            </ItemDescription>
                        </ItemContent>
                    </Item>
                </ItemGroup>

                <Separator />

                <div className="grid w-full gap-3">
                    {user.role === "admin" && (
                        <Link to="/admin">
                            <Button className="w-full gap-2">
                                <LayoutDashboard />
                                Admin Panel
                            </Button>
                        </Link>
                    )}

                    <Button
                        variant="destructive"
                        className="w-full gap-2"
                        onClick={async () => {
                            sdk.users.deleteUsersMe().then(({ error }) => {
                                if (error) {
                                    toast.error(`Failed to sign out: ${error.message}`);
                                    return;
                                }
                                toast.success("Signed out successfully!");
                                setUser(null);
                            });
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
            {(["login", "register"] satisfies AuthFormType[]).map((t) => (
                <TabsContent key={t} value={t} className="mt-4 space-y-3">
                    <AuthForm type={t} onSuccess={setUser} />
                    {t === "login" && (
                        <div className="text-center text-xs text-muted-foreground pb-2">
                            <Link to="/forgot-password" className="underline underline-offset-4">
                                Forgot password?
                            </Link>
                        </div>
                    )}
                </TabsContent>
            ))}
        </Tabs>
    );
}

export function AuthForm({
    type,
    onSuccess,
    onCancel,
}: {
    type: AuthFormType;
    onSuccess?: (user: User | null) => void;
    onCancel?: () => void;
}) {
    const [submitError, setSubmitError] = useState<string | null>(null);
    const schema =
        type === "login"
            ? schemas[type]
            : (schemas[type] as z.ZodObject<{ password: z.ZodString } & Record<string, z.ZodTypeAny>>)
                  .extend({ confirm_password: z.string() })
                  .refine((data) => data.password === data.confirm_password, {
                      message: "Passwords do not match",
                      path: ["confirm_password"],
                  });
    const fields = schema.shape;
    const errorMap: z.core.ParseContext<z.core.$ZodIssue> = {
        error: (issue) => {
            if (issue.code === "invalid_format" && issue.format === "regex" && issue.path?.includes("password")) {
                return { message: "Must include uppercase, lowercase, number, and special character" };
            }
            return undefined;
        },
    };
    const form = useAppForm({
        defaultValues: Object.fromEntries(Object.keys(fields).map((key) => [key, ""])),
        validators: {
            onChangeAsync: async ({ value, formApi }) => {
                const dirtyFields = Object.keys(formApi.fieldInfo).filter(
                    (key) => formApi.getFieldMeta(key as keyof typeof formApi.fieldInfo)!.isDirty,
                );
                return parseWithSchema({ value, schema, fields: dirtyFields, params: errorMap }).errors;
            },
            onChangeAsyncDebounceMs: 300,
            onSubmitAsync: async ({ value }) => {
                setSubmitError(null);
                const { parsed, errors } = parseWithSchema({ value, schema, params: errorMap });
                if (errors) {
                    setSubmitError("Invalid input!");
                    return errors;
                }
                const { error, data } = await (async () => {
                    switch (type) {
                        case "change":
                            return await sdk.users.putUsersChangePassword({ body: schemas[type].parse(parsed) });
                        case "login":
                            return await sdk.users.postUsersMe({ body: schemas[type].parse(parsed) });
                        case "register":
                            return await sdk.users.postUsersRegister({ body: schemas[type].parse(parsed) });
                    }
                })();
                if (error) {
                    toast.error(
                        `Failed to ${type === "change" ? "change password" : type === "login" ? "login" : "register"}: ${error.message}`,
                    );
                    setSubmitError(error.message!);
                    if ((error as ServerValidationException).errors) return (error as ServerValidationException).errors;
                    return { form: { form: error.message || "Server error", fields: {} } };
                }
                if (data && !data.verified) {
                    toast.info("Please check your email to verify your account before signing in.");
                    onSuccess?.(null);
                    return;
                }
                toast.success(
                    `${type === "change" ? "Password changed" : type === "login" ? "Logged in" : "Registered"} successfully!`,
                );
                onSuccess?.(data || null);
            },
        },
        onSubmit: async () => {},
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
                            <Button
                                type="submit"
                                className={onCancel ? "flex-1" : "w-full"}
                                size="sm"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? <Spinner /> : submitLabel}
                            </Button>
                            {onCancel && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={onCancel}
                                    disabled={isSubmitting}
                                >
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
