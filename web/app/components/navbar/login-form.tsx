import { z } from "zod";
import { useAppForm } from "@/components/ui/form-tanstack";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { onChangeAsync } from "@/lib/utils";
import { useRouteLoaderData, useRevalidator } from "react-router";
import { useState } from "react";
import type { loader as rootLoader } from "@/root";

// TODO: add descriptions "input-group"
const temp = z.object({
    type: z.literal("Register"),
    Username: z.string().min(2).max(50),
    Email: z.email(),
    Password: z
        .string()
        .min(8)
        .max(100)
        .regex(/[A-Z]/, "Must contain at least one uppercase letter")
        .regex(/[a-z]/, "Must contain at least one lowercase letter")
        .regex(/[0-9]/, "Must contain at least one number")
        .regex(/[^A-Za-z0-9]/, "Must contain at least one special character"),
    Confirm_Password: z.string().min(8).max(100),
});
temp.refine((data) => data.Password === data.Confirm_Password, {
    error: "Passwords do not match",
    when(data) {
        return temp.pick({ Password: true, Confirm_Password: true }).safeParse(data).success;
    },
});

const schema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("Login"),
        Username: z.string(),
        Password: z.string(),
    }),
    temp,
]);


export function LoginForm() {
    const rootData = useRouteLoaderData<typeof rootLoader>("root");
    const { revalidate } = useRevalidator();

    if (rootData?.user) {
        return (
            <div className="p-4 space-y-2">
                <p className="text-sm font-medium">Welcome, {rootData.user.username}</p>
                <p className="text-xs text-muted-foreground">{rootData.user.email}</p>
                <Button
                    className="w-full"
                    variant="outline"
                    onClick={async () => {
                        await fetch("/api/users", {
                            method: "DELETE",
                            headers: { "X-CSRF-Token": rootData.csrfToken ?? "" },
                        });
                        revalidate();
                    }}
                >
                    Logout
                </Button>
            </div>
        );
    }

    return (
        <Tabs defaultValue="Login">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="Login">Login</TabsTrigger>
                <TabsTrigger value="Register">Register</TabsTrigger>
            </TabsList>
            {(["Login", "Register"] satisfies FormTypes[]).map((t) => (
                <TabsContent key={t} value={t}>
                    <Form type={t} csrfToken={rootData?.csrfToken ?? null} onSuccess={revalidate} />
                </TabsContent>
            ))}
        </Tabs>
    );
}
type FormTypes = "Login" | "Register";

function Form({
    type,
    csrfToken,
    onSuccess,
}: {
    type: FormTypes;
    csrfToken: string | null;
    onSuccess: () => void;
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
            setSubmitError(null);
            const response = await fetch("/api/users", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-Token": csrfToken ?? "",
                },
                body: JSON.stringify(value),
            });
            if (response.ok) {
                onSuccess();
            } else {
                const error = await response.json().catch(() => null);
                setSubmitError(
                    error?.detail?.[0]?.msg ?? error?.detail ?? `Failed to ${type.toLowerCase()}`,
                );
            }
        },
    });
    return (
        <form.AppForm>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    form.handleSubmit();
                }}
                className="space-y-2"
            >
                {Object.keys(fields)
                    .filter((key) => key !== "type")
                    .map((key) => (
                        <form.AppField name={key as keyof typeof fields} key={key}>
                            {(field) => (
                                <form.Item>
                                    <field.Control>
                                        <Input
                                            placeholder={key.replaceAll("_", " ")}
                                            type={key.includes("Password") ? "password" : "text"}
                                            autoComplete={
                                                key === "Username"
                                                    ? "username"
                                                    : type === "Login"
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
                {submitError && <p className="text-destructive text-sm">{submitError}</p>}
                <Button type="submit" className="w-full mt-2">
                    {type}
                </Button>
            </form>
        </form.AppForm>
    );
}
