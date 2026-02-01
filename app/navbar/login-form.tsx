import { z } from "zod";
import { useAppForm } from "@/components/ui/form-tanstack";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
    return (
        <Tabs defaultValue="Login" className="w-80">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="Login">Login</TabsTrigger>
                <TabsTrigger value="Register">Register</TabsTrigger>
            </TabsList>
            {["Login", "Register"].map((t) => (
                <TabsContent key={t} value={t}>
                    <Form type={t} />
                </TabsContent>
            ))}
        </Tabs>
    );
}

function Form({ type }: { type: string }) {
    const fields = schema.options.find((opt) => opt.shape.type.value === type)!.shape;
    const form = useAppForm({
        defaultValues: Object.fromEntries(
            Object.keys(fields).map((key) => (key === "type" ? [key, type] : [key, ""])),
        ) as z.infer<typeof schema>,
        validators: {
            onChangeAsync: ({ formApi }) => {
                const errors = formApi.parseValuesWithSchema(schema);
                if (!errors) return errors;

                const dirtyFields = Object.keys(formApi.fieldInfo).filter(
                    (key) => formApi.getFieldMeta(key as keyof typeof formApi.fieldInfo)!.isDirty,
                );
                return {
                    form: Object.fromEntries(Object.entries(errors.form).filter(([key]) => dirtyFields.includes(key))),
                    fields: Object.fromEntries(
                        Object.entries(errors.fields).filter(([key]) => dirtyFields.includes(key)),
                    ),
                };
            },
            onChangeAsyncDebounceMs: 300,
            onSubmit: schema,
        },
        onSubmit: (data) => {
            console.log(data);
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
                <Button type="submit" className="w-full mt-2">
                    {type}
                </Button>
            </form>
        </form.AppForm>
    );
}
