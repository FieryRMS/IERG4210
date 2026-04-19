"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppForm } from "@/components/ui/form-tanstack";
import { sdk } from "@/lib/utils";
import { zResetPassword } from "@/lib/generated/zod.gen";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Link, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { z } from "zod";

export function meta() {
    return [{ title: "Reset Password | The Generic Company" }];
}

const schema = zResetPassword
    .extend({ confirm_password: z.string() })
    .refine((d) => d.password === d.confirm_password, {
        message: "Passwords do not match",
        path: ["confirm_password"],
    });

export default function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const id = searchParams.get("id") ?? "";
    const token = searchParams.get("token") ?? "";

    const form = useAppForm({
        defaultValues: { password: "", confirm_password: "" },
        validators: {
            onSubmitAsync: async ({ value }) => {
                const parsed = schema.safeParse({ ...value, id, token });
                if (!parsed.success) {
                    const issues = Object.fromEntries(
                        parsed.error.issues.map((i) => [i.path.join("."), i.message]),
                    );
                    return { form: { form: "Invalid input", fields: issues } };
                }
                const { error } = await sdk.users.postUsersResetPassword({ body: parsed.data });
                if (error) {
                    toast.error(error.message ?? "Failed to reset password.");
                    return { form: { form: error.message ?? "Error", fields: {} } };
                }
                toast.success("Password reset! Please sign in.");
                navigate("/");
            },
        },
        onSubmit: async () => {},
    });

    if (!id || !token) {
        return (
            <main className="container mx-auto flex min-h-[60vh] items-center justify-center px-4">
                <p className="text-muted-foreground text-sm">
                    Invalid reset link.{" "}
                    <Link to="/forgot-password" className="underline underline-offset-4">
                        Request a new one.
                    </Link>
                </p>
            </main>
        );
    }

    return (
        <main className="container mx-auto flex min-h-[60vh] items-center justify-center px-4 py-10">
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle>Reset password</CardTitle>
                    <CardDescription>Enter your new password below.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form.AppForm>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                form.handleSubmit();
                            }}
                            className="space-y-3"
                        >
                            {(["password", "confirm_password"] as const).map((key) => (
                                <form.AppField name={key} key={key}>
                                    {(field) => (
                                        <form.Item>
                                            <field.Control>
                                                <Input
                                                    placeholder={key === "password" ? "New password" : "Confirm password"}
                                                    type="password"
                                                    autoComplete="new-password"
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
                            <form.Subscribe selector={(s) => s.isSubmitting}>
                                {(isSubmitting) => (
                                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                                        {isSubmitting ? <Spinner /> : "Reset password"}
                                    </Button>
                                )}
                            </form.Subscribe>
                        </form>
                    </form.AppForm>
                </CardContent>
            </Card>
        </main>
    );
}
