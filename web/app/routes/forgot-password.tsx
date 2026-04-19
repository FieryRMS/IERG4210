"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppForm } from "@/components/ui/form-tanstack";
import { sdk } from "@/lib/utils";
import { zForgotPassword } from "@/lib/generated/zod.gen";
import { useState } from "react";
import { Link } from "react-router";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function meta() {
    return [{ title: "Forgot Password | The Generic Company" }];
}

export default function ForgotPasswordPage() {
    const [sent, setSent] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const form = useAppForm({
        defaultValues: { email: "" },
        validators: {
            onSubmitAsync: async ({ value }) => {
                setSubmitError(null);
                const parsed = zForgotPassword.safeParse(value);
                if (!parsed.success) {
                    return { form: { form: "Invalid email", fields: { email: parsed.error.issues } } };
                }
                const { error } = await sdk.users.postUsersForgotPassword({ body: parsed.data });
                if (error) {
                    setSubmitError(error.message ?? "Something went wrong. Please try again.");
                    return;
                }
                setSent(true);
            },
        },
        onSubmit: async () => {},
    });

    return (
        <main className="container mx-auto flex min-h-[60vh] items-center justify-center px-4 py-10">
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle>Forgot password</CardTitle>
                    <CardDescription>
                        {sent
                            ? "If that email is registered, you'll receive a reset link shortly."
                            : "Enter your email and we'll send you a reset link."}
                    </CardDescription>
                </CardHeader>
                {!sent && (
                    <CardContent>
                        <form.AppForm>
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    form.handleSubmit();
                                }}
                                className="space-y-3"
                            >
                                <form.AppField name="email">
                                    {(field) => (
                                        <form.Item>
                                            <field.Control>
                                                <Input
                                                    placeholder="Email"
                                                    type="email"
                                                    autoComplete="email"
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
                                {submitError && (
                                    <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{submitError}</p>
                                )}
                                <form.Subscribe selector={(s) => s.isSubmitting}>
                                    {(isSubmitting) => (
                                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                                            {isSubmitting ? <Spinner /> : "Send reset link"}
                                        </Button>
                                    )}
                                </form.Subscribe>
                            </form>
                        </form.AppForm>
                        <p className="mt-4 text-center text-sm text-muted-foreground">
                            <Link to="/" className="underline underline-offset-4">
                                Back to home
                            </Link>
                        </p>
                    </CardContent>
                )}
            </Card>
        </main>
    );
}
