import type { Route } from "./+types/admin";
import type { PageHandle } from "@/types";
import type {
    Product,
    ProductCreate,
    ProductUpdate,
    Category,
    CategoryCreate,
    CategoryUpdate,
    Image,
    ImageCreate,
    ImageUpdate,
    User,
    UserCreate,
    UserUpdate,
    Session,
    Order,
    Transaction,
    ProductOrder,
    PasswordResetToken,
    EmailVerificationToken,
} from "@/lib/generated/types.gen";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Any2FormData, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Img } from "@/components/img-wrapper";
import { ButtonGroup } from "@/components/ui/button-group";
import { toast } from "sonner";
import { getConfig, UPLOAD_URL } from "@/config";
import { CsrfContext, UserContext } from "@/lib/security.server";
import { sdk } from "@/lib/utils";
import { getAuth } from "@/lib/server.utils";
import { TableGenerator, type Config, FieldConfigDefaults } from "@/components/tablegenerator";
import { redirect } from "react-router";
import React, { useEffect, useState } from "react";
import {
    zCategoryCreate,
    zCategoryUpdate,
    zDeleteCategoriesByIdData,
    zDeleteImagesByIdData,
    zDeleteProductsByIdData,
    zDeleteUsersByIdData,
    zDeleteUsersResetTokensByIdData,
    zDeleteUsersSessionsByIdData,
    zDeleteUsersVerifyTokensByIdData,
    zImageCreate,
    zImageUpdate,
    zProductCreate,
    zProductUpdate,
    zUserCreate,
    zUserUpdate,
} from "@/lib/generated/zod.gen";
import {
    Combobox,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxItemIndicator,
    ComboboxList,
    ComboboxPopup,
    ComboboxPositioner,
} from "@/components/ui/combobox";
import { XIcon } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import type { AnyFieldApi, AnyFormApi } from "@tanstack/react-form";
import { useAuth } from "@/hooks/auth";
import { useNavigate } from "react-router";

export type TableTypes =
    | "Product"
    | "Category"
    | "Image"
    | "User"
    | "Session"
    | "Product Images"
    | "Order"
    | "Transaction"
    | "Password Reset Token"
    | "Email Verification Token";

function TableCombobox<T>({
    items,
    getLabel,
    getIndex,
    getValue,
    placeholder,
    disabled,
    field,
    className,
    form,
}: {
    items: T[];
    getLabel: (item: T) => string;
    getIndex: (item: T) => string;
    getValue: (item: T) => unknown;
    placeholder?: string;
    disabled: boolean;
    field: AnyFieldApi;
    className?: string;
    form: AnyFormApi;
}) {
    const id = React.useId();
    return (
        <Combobox
            items={items}
            value={field.state.value ?? ""}
            onValueChange={(e) => field.handleChange(e)}
            readOnly={disabled}
        >
            <InputGroup className={cn("text-center border-primary/50", disabled && "opacity-80 border-primary/10")}>
                <ComboboxInput
                    placeholder={placeholder}
                    id={id}
                    className={cn(className, "pr-0! px-1")}
                    render={<InputGroupInput />}
                    readOnly={disabled}
                />
                <InputGroupAddon align="inline-end" className={cn(disabled && "opacity-80")}>
                    <button
                        onClick={() => form.resetField(field.name)}
                        className="enabled:hover:text-primary"
                        disabled={disabled}
                    >
                        <XIcon className={cn("size-4", !field.state.value && "invisible")} />
                    </button>
                </InputGroupAddon>
            </InputGroup>
            <ComboboxPositioner sideOffset={6}>
                <ComboboxPopup>
                    <ComboboxEmpty>{field.name} not found.</ComboboxEmpty>
                    <ComboboxList>
                        {(item: T) => (
                            <ComboboxItem key={getIndex(item)} value={getValue(item)} className="w-full">
                                <ComboboxItemIndicator />
                                <div className="col-start-2 text-nowrap text-center w-full">{getLabel(item)}</div>
                            </ComboboxItem>
                        )}
                    </ComboboxList>
                </ComboboxPopup>
            </ComboboxPositioner>
        </Combobox>
    );
}

const config = getConfig("/images", "post")!;

const url = z.union([
    z.url({
        protocol: /^https?$/,
        hostname: z.regexes.domain,
    }),
    z.string().regex(new RegExp(`^${UPLOAD_URL}`)),
    z
        .file()
        .max(config.maxFileSize)
        .refine((file) => file.type.match(config.type), {
            message: "Invalid file type",
        }),
]);

export async function loader({ request, context }: Route.LoaderArgs) {
    const user = context.get(UserContext);
    if (!user || user.role !== "admin") throw redirect("/");
    const auth = await getAuth(request);
    const { request: _prq, response: _prs, ...products } = await sdk.products.getProducts(auth);
    const { request: _crq, response: _crs, ...categories } = await sdk.categories.getCategories(auth);
    const { request: _irq, response: _irs, ...images } = await sdk.images.getImages(auth);
    const { request: _urq, response: _urs, ...users } = await sdk.users.getUsers(auth);
    const { request: _orq, response: _ors, ...orders } = await sdk.orders.getOrders(auth);
    const { request: _ptrq, response: _ptrs, ...transactions } = await sdk.transactions.getTransactions(auth);
    const { request: _rtrq, response: _rtrs, ...resetTokens } = await sdk.users.getUsersResetTokens(auth);
    const { request: _vtrq, response: _vtrs, ...verifyTokens } = await sdk.users.getUsersVerifyTokens(auth);
    const csrf = context.get(CsrfContext);

    return {
        products,
        categories,
        images,
        users,
        orders,
        transactions,
        resetTokens,
        verifyTokens,
        csrf,
    };
}

export default function Admin({ loaderData }: Route.ComponentProps) {
    const [products, setProducts] = useState(loaderData.products.data ?? []);
    const [categories, setCategories] = useState(loaderData.categories.data ?? []);
    const [images, setImages] = useState(loaderData.images.data ?? []);
    const [users, setUsers] = useState(loaderData.users.data ?? []);
    const [orders, setOrders] = useState(loaderData.orders.data ?? []);
    const [transactions, setTransactions] = useState(loaderData.transactions.data ?? []);
    const [resetTokens, setResetTokens] = useState(loaderData.resetTokens.data ?? []);
    const [verifyTokens, setVerifyTokens] = useState(loaderData.verifyTokens.data ?? []);
    const { user } = useAuth();
    const navigate = useNavigate();

    const imageMap = React.useMemo(() => {
        const map = new Map<unknown, Image>();
        images.forEach((img) => {
            if (img.id) map.set(img.id, img);
        });
        return map;
    }, [images]);

    const productMap = React.useMemo(() => {
        const map = new Map<unknown, Product>();
        products.forEach((product) => {
            if (product.id) map.set(product.id, product);
        });
        return map;
    }, [products]);

    useEffect(() => {
        if (user?.role !== "admin") {
            navigate("/");
        }
    }, [user, navigate]);

    const PConfig: Config<Product, TableTypes> = {
        TableType: "Product",
        desc: "Product CRUD",
        methods: {
            post: zProductCreate,
            put: zProductUpdate,
            delete: zDeleteProductsByIdData.shape.path,
        },
        onSubmit: async ({ method, value }) => {
            switch (method) {
                case "post":
                    return sdk.products.postProducts({ body: value as ProductCreate }).then(({ data, error }) => {
                        if (error || !data) {
                            toast.error(`Failed to create product: ${error.message!}`);
                            throw error;
                        }
                        return data;
                    });
                case "put":
                    return sdk.products.putProducts({ body: value as ProductUpdate }).then(({ data, error }) => {
                        if (error || !data) {
                            toast.error(`Failed to update product: ${error.message}`);
                            throw error;
                        }
                        return data;
                    });
                case "delete":
                    return sdk.products.deleteProductsById({ path: { id: value.id! as string } }).then(({ error }) => {
                        if (error) {
                            toast.error(`Failed to delete product: ${error.message}`);
                            throw error;
                        }
                    });
            }
        },
        fields: FieldConfigDefaults<Product, TableTypes>([
            { key: "id", disabled: () => true },
            { key: "created_at", disabled: () => true },
            { key: "updated_at", disabled: () => true },
            { key: "name" },
            { key: "description" },
            { key: "price" },
            {
                key: "catid",

                Render: ({ disabled, field, className, form }) => (
                    <TableCombobox
                        items={categories}
                        getLabel={(item) => item.name ?? item.id!}
                        getIndex={(item) => item.id!}
                        getValue={(item) => item.id!}
                        placeholder="Category ID"
                        disabled={disabled}
                        field={field}
                        className={className}
                        form={form}
                    />
                ),
            },
            {
                key: "images",
                toSchemaType: (data) => (Array.isArray(data) ? data.map((d) => String(d.id)) : []),
                fromSchemaType: (value) =>
                    Array.isArray(value)
                        ? value.reduce((acc, id) => {
                              const img = imageMap.get(id);
                              if (img) acc.push(img);
                              return acc;
                          }, [] as Image[])
                        : [],
                nested: {
                    TableType: "Product Images",
                    methods: {
                        post: zDeleteImagesByIdData.shape.path,
                        put: zDeleteImagesByIdData.shape.path,
                        delete: zDeleteImagesByIdData.shape.path,
                    },
                    desc: "Manage images associated with the product - Click submit on product to save",
                    onSubmit: ({ value }) => {
                        const img = imageMap.get(value.id);
                        if (!img) throw new Error("Image not found");
                        return img;
                    },
                    fields: FieldConfigDefaults<Image>([
                        {
                            key: "id",
                            name: "preview",
                            disabled: () => true,
                            Render: ({ create, field }) => {
                                const image = imageMap.get(field.state.value);
                                if (!image) return <> </>;
                                return !create ? (
                                    <Img
                                        src={`${image.url}?resize`}
                                        alt="Image preview"
                                        className="h-20 w-20 object-cover m-auto rounded-md"
                                    />
                                ) : (
                                    <> </>
                                );
                            },
                        },
                        {
                            key: "id",
                            Render: ({ disabled, field, className, form }) => (
                                <TableCombobox
                                    items={images}
                                    getLabel={(item) => item.alt ?? item.id!}
                                    getIndex={(item) => item.id!}
                                    getValue={(item) => item.id!}
                                    placeholder="Image ID"
                                    disabled={disabled}
                                    field={field}
                                    className={className}
                                    form={form}
                                />
                            ),
                        },
                    ]),
                },
            },
        ]),
    };
    const CConfig: Config<Category, TableTypes> = {
        TableType: "Category",
        desc: "Category CRUD",
        methods: {
            post: zCategoryCreate,
            put: zCategoryUpdate,
            delete: zDeleteCategoriesByIdData.shape.path,
        },
        onSubmit: async ({ method, value }) => {
            switch (method) {
                case "post":
                    return sdk.categories.postCategories({ body: value as CategoryCreate }).then(({ data, error }) => {
                        if (error || !data) {
                            toast.error(`Failed to create category: ${error.message!}`);
                            throw error;
                        }
                        return data;
                    });
                case "put":
                    return sdk.categories.putCategories({ body: value as CategoryUpdate }).then(({ data, error }) => {
                        if (error || !data) {
                            toast.error(`Failed to update category: ${error.message}`);
                            throw error;
                        }
                        return data;
                    });
                case "delete":
                    return sdk.categories
                        .deleteCategoriesById({ path: { id: value.id! as string } })
                        .then(({ error }) => {
                            if (error) {
                                toast.error(`Failed to delete category: ${error.message}`);
                                throw error;
                            }
                        });
            }
        },
        fields: FieldConfigDefaults<Category>([
            { key: "id", disabled: () => true },
            { key: "created_at", disabled: () => true },
            { key: "updated_at", disabled: () => true },
            { key: "name" },
            { key: "description" },
        ]),
    };

    const IConfig: Config<Image, TableTypes> = {
        TableType: "Image",
        methods: {
            post: zImageCreate.extend({ url }),
            put: zImageUpdate.extend({ url: url.nullish() }),
            delete: zDeleteImagesByIdData.shape.path,
        },
        desc: "Image CRUD",
        onSubmit: async ({ method, value }) => {
            switch (method) {
                case "post":
                    return sdk.images
                        .postImages({
                            body: Any2FormData(value) as unknown as ImageCreate,
                            headers: {
                                "Content-Type": "multipart/form-data",
                            },
                        })
                        .then(({ data, error }) => {
                            if (error || !data) {
                                toast.error(`Failed to create image: ${error.message!}`);
                                throw error;
                            }
                            return data;
                        });
                case "put":
                    return sdk.images
                        .putImages({
                            body: Any2FormData(value) as unknown as ImageUpdate,
                            headers: {
                                "Content-Type": "multipart/form-data",
                            },
                        })
                        .then(({ data, error }) => {
                            if (error || !data) {
                                toast.error(`Failed to update image: ${error.message}`);
                                throw error;
                            }
                            return data;
                        });
                case "delete":
                    return sdk.images.deleteImagesById({ path: { id: value.id! as string } }).then(({ error }) => {
                        if (error) {
                            toast.error(`Failed to delete image: ${error.message}`);
                            throw error;
                        }
                    });
            }
        },
        fields: FieldConfigDefaults<Image>([
            { key: "id", disabled: () => true },
            { key: "created_at", disabled: () => true },
            { key: "updated_at", disabled: () => true },
            {
                key: "url",
                name: "preview",
                disabled: () => true,
                Render: ({ field }) => {
                    const src =
                        field.state.value instanceof File
                            ? URL.createObjectURL(field.state.value)
                            : field.state.value && (field.state.meta.isPristine || field.state.meta.isValid)
                              ? `${field.state.value}?resize=0.1`
                              : undefined;
                    return <Img src={src} alt="Image preview" className="h-20 w-20 object-cover m-auto rounded-md" />;
                },
            },
            {
                key: "url",
                file: true,
                Render: ({ disabled, field, className }) => {
                    const [isDragging, setIsDragging] = useState(false);
                    const dragDepthRef = React.useRef(0);

                    useEffect(() => {
                        const hasFiles = (e: DragEvent) =>
                            !!e.dataTransfer && Array.from(e.dataTransfer.types).includes("Files");
                        const resetDragging = () => {
                            dragDepthRef.current = 0;
                            setIsDragging(false);
                        };

                        const onDragEnter = (e: DragEvent) => {
                            if (!hasFiles(e)) return;
                            dragDepthRef.current += 1;
                            setIsDragging(true);
                        };

                        const onDragLeave = (e: DragEvent) => {
                            if (!hasFiles(e)) return;
                            dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
                            if (dragDepthRef.current === 0) {
                                setIsDragging(false);
                            }
                        };

                        const onDragOver = (e: DragEvent) => {
                            if (!hasFiles(e)) return;
                            e.preventDefault();
                        };

                        const onDrop = () => {
                            resetDragging();
                        };

                        const onDragEnd = () => {
                            resetDragging();
                        };

                        const onWindowBlur = () => {
                            resetDragging();
                        };
                        if (!disabled) {
                            window.addEventListener("dragenter", onDragEnter, true);
                            window.addEventListener("dragleave", onDragLeave, true);
                            window.addEventListener("dragover", onDragOver, true);
                            window.addEventListener("drop", onDrop, true);
                            window.addEventListener("dragend", onDragEnd, true);
                            window.addEventListener("blur", onWindowBlur);
                        }

                        return () => {
                            window.removeEventListener("dragenter", onDragEnter, true);
                            window.removeEventListener("dragleave", onDragLeave, true);
                            window.removeEventListener("dragover", onDragOver, true);
                            window.removeEventListener("drop", onDrop, true);
                            window.removeEventListener("dragend", onDragEnd, true);
                            window.removeEventListener("blur", onWindowBlur);
                        };
                    }, [disabled]);

                    const setFile = (file?: File) => {
                        if (file) {
                            // TODO: Active bug in Tanstack: https://github.com/TanStack/form/issues/1932#issuecomment-3656323010
                            Object.defineProperties(file, {
                                name: { value: file.name, enumerable: true },
                                size: { value: file.size, enumerable: true },
                                type: { value: file.type, enumerable: true },
                            });
                            field.handleChange(file);
                        }
                    };

                    return (
                        <ButtonGroup
                            className="w-full relative"
                            onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                e.dataTransfer.dropEffect = "copy";
                            }}
                            onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                dragDepthRef.current = 0;
                                setIsDragging(false);
                                setFile(e.dataTransfer.files[0]);
                            }}
                        >
                            <Input
                                onChange={(e) => field.handleChange(e.target.value)}
                                readOnly={disabled}
                                className={className}
                                value={
                                    field.state.value instanceof File
                                        ? field.state.value.name
                                        : (field.state.value ?? "")
                                }
                            />
                            <Button
                                type="button"
                                onClick={(e) => {
                                    const child = e.currentTarget?.children[0] as HTMLInputElement | null;
                                    child?.click();
                                }}
                                disabled={disabled}
                            >
                                <Input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                        setFile(e.target.files?.[0]);
                                        e.currentTarget.value = "";
                                    }}
                                />
                                File
                            </Button>
                            <span data-base-ui-inert className={cn((disabled || !isDragging) && "hidden")}>
                                <Input
                                    readOnly={true}
                                    className={cn(
                                        "absolute inset-0 bg-background! border-dashed border-accent-foreground text-center",
                                    )}
                                    defaultValue="Drag & Drop"
                                />
                            </span>
                        </ButtonGroup>
                    );
                },
            },
            { key: "alt" },
        ]),
    };

    const UConfig: Config<User, TableTypes> = {
        TableType: "User",
        methods: {
            post: zUserCreate,
            put: zUserUpdate,
            delete: zDeleteUsersByIdData.shape.path,
        },
        desc: "User CRUD",
        onSubmit: async ({ method, value }) => {
            switch (method) {
                case "post":
                    return sdk.users.postUsers({ body: value as UserCreate }).then(({ data, error }) => {
                        if (error || !data) {
                            toast.error(`Failed to create user: ${error.message!}`);
                            throw error;
                        }
                        return data;
                    });
                case "put":
                    return sdk.users.putUsers({ body: value as UserUpdate }).then(({ data, error }) => {
                        if (error || !data) {
                            toast.error(`Failed to update user: ${error.message}`);
                            throw error;
                        }
                        return data;
                    });
                case "delete":
                    return sdk.users.deleteUsersById({ path: { id: value.id! as string } }).then(({ error }) => {
                        if (error) {
                            toast.error(`Failed to delete user: ${error.message}`);
                            throw error;
                        }
                    });
            }
        },
        fields: FieldConfigDefaults<User, TableTypes>([
            { key: "id", disabled: () => true },
            { key: "created_at", disabled: () => true },
            { key: "updated_at", disabled: () => true },
            { key: "email" },
            { key: "username" },
            {
                key: "verified",
                Render: ({ disabled, field, className, form }) => (
                    <TableCombobox
                        items={[true, false]}
                        getLabel={(item) => String(item)}
                        getIndex={(item) => String(item)}
                        getValue={(item) => item}
                        placeholder="Verified"
                        disabled={disabled}
                        field={field}
                        className={className}
                        form={form}
                    />
                ),
            },
            {
                key: "role",
                Render: ({ disabled, field, className, form }) => (
                    <TableCombobox
                        items={[
                            { id: "admin", name: "admin" },
                            { id: "user", name: "user" },
                        ]}
                        getLabel={(item) => item.name}
                        getIndex={(item) => item.id!}
                        getValue={(item) => item.id!}
                        placeholder="Role"
                        disabled={disabled}
                        field={field}
                        className={className}
                        form={form}
                    />
                ),
            },
            {
                key: "password",
                Render: ({ disabled, field, className }) => {
                    return (
                        <Input
                            type="password"
                            value={field.state.value ?? ""}
                            name={field.name}
                            onChange={(e) => field.handleChange(e.target.value)}
                            className={cn("field-sizing-content", className)}
                            readOnly={disabled}
                        />
                    );
                },
            },
            {
                key: "sessions",
                exclude: true,
                disabled: ({ isEditing, isSubmitting, create }) => isSubmitting || isEditing || create,
                nested: {
                    TableType: "Session",
                    saveOnSubmit: true,
                    desc: "Manage user sessions - deletes sesion directly",
                    methods: {
                        delete: zDeleteUsersSessionsByIdData.shape.path,
                    },
                    onSubmit: async ({ method, value }) => {
                        if (method === "delete") {
                            return sdk.users
                                .deleteUsersSessionsById({ path: { id: value.id! as string } })
                                .then(({ error }) => {
                                    if (error) {
                                        toast.error(`Failed to delete session: ${error.message}`);
                                        throw error;
                                    }
                                });
                        }
                    },
                    fields: FieldConfigDefaults<Session, TableTypes>([
                        { key: "id", disabled: () => true },
                        { key: "created_at", disabled: () => true },
                        { key: "user_id", disabled: () => true },
                    ]),
                },
            },
        ]),
    };

    const OConfig: Config<Order, TableTypes> = {
        TableType: "Order",
        desc: "Order CRUD",
        onSubmit: () => {},
        fields: FieldConfigDefaults<Order, TableTypes>([
            { key: "id", disabled: () => true },
            { key: "created_at", disabled: () => true },
            { key: "updated_at", disabled: () => true },
            { key: "user_id" },
            { key: "paid" },
            { key: "currency" },
            { key: "total_price" },
            {
                key: "products",
                disabled: () => false,
                nested: {
                    TableType: "Product",
                    desc: "Products for Order",
                    onSubmit: () => {},
                    fields: FieldConfigDefaults<ProductOrder, TableTypes>([
                        { key: "id", disabled: () => true },
                        {
                            key: "id",
                            name: "name",
                            Render: ({ disabled, field, className }) => {
                                const name = productMap.get(field.state.value)?.name ?? field.state.value;
                                return (
                                    <Input
                                        type="text"
                                        inputMode="numeric"
                                        value={name}
                                        className={className}
                                        readOnly={disabled}
                                    />
                                );
                            },
                        },
                        { key: "price", disabled: () => true },
                        { key: "count", disabled: () => true },
                    ]),
                },
            },
        ]),
    };

    const RTConfig: Config<PasswordResetToken, TableTypes> = {
        TableType: "Password Reset Token",
        desc: "Password Reset Tokens",
        onSubmit: async ({ method, value }) => {
            if (method === "delete") {
                return sdk.users.deleteUsersResetTokensById({ path: { id: value.id! as string } }).then(({ error }) => {
                    if (error) {
                        toast.error(`Failed to delete token: ${error.message}`);
                        throw error;
                    }
                });
            }
        },
        methods: { delete: zDeleteUsersResetTokensByIdData.shape.path },
        fields: FieldConfigDefaults<PasswordResetToken, TableTypes>([
            { key: "id", disabled: () => true },
            { key: "created_at", disabled: () => true },
            { key: "user_id", disabled: () => true },
        ]),
    };

    const VTConfig: Config<EmailVerificationToken, TableTypes> = {
        TableType: "Email Verification Token",
        desc: "Email Verification Tokens",
        onSubmit: async ({ method, value }) => {
            if (method === "delete") {
                return sdk.users
                    .deleteUsersVerifyTokensById({ path: { id: value.id! as string } })
                    .then(({ error }) => {
                        if (error) {
                            toast.error(`Failed to delete token: ${error.message}`);
                            throw error;
                        }
                    });
            }
        },
        methods: { delete: zDeleteUsersVerifyTokensByIdData.shape.path },
        fields: FieldConfigDefaults<EmailVerificationToken, TableTypes>([
            { key: "id", disabled: () => true },
            { key: "created_at", disabled: () => true },
            { key: "user_id", disabled: () => true },
        ]),
    };

    const TConfig: Config<Transaction, TableTypes> = {
        TableType: "Transaction",
        desc: "Transaction CRUD",
        onSubmit: async () => {},
        fields: FieldConfigDefaults<Transaction, TableTypes>([
            { key: "id", disabled: () => true },
            { key: "created_at", disabled: () => true },
            { key: "updated_at", disabled: () => true },
            { key: "transaction_id" },
            { key: "order_id" },
            { key: "status" },
            { key: "price" },
            { key: "provider" },
        ]),
    };

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4 w-full text-center">Admin Dashboard</h1>
            <div className="flex flex-col">
                <div className="p-4 rounded shadow">
                    <h2 className="text-xl font-semibold mb-2 w-full text-center">Products</h2>
                    {loaderData.products.error ? (
                        <p className="text-xl font-semibold mb-2 w-full text-center text-red-500">
                            Failed to load products:{" "}
                            {`${loaderData.products.error.name} - ${loaderData.products.error.message}`}
                        </p>
                    ) : (
                        <TableGenerator data={products ?? []} config={PConfig} onSubmit={setProducts} />
                    )}
                </div>
                <div className="p-4 rounded shadow">
                    <h2 className="text-xl font-semibold mb-2 w-full text-center">Categories</h2>
                    {loaderData.categories.error ? (
                        <p className="text-xl font-semibold mb-2 w-full text-center text-red-500">
                            Failed to load categories:{" "}
                            {`${loaderData.categories.error.name} - ${loaderData.categories.error.message}`}
                        </p>
                    ) : (
                        <TableGenerator data={categories ?? []} config={CConfig} onSubmit={setCategories} />
                    )}
                </div>
                <div className="p-4 rounded shadow">
                    <h2 className="text-xl font-semibold mb-2 w-full text-center">Images</h2>
                    {loaderData.images.error ? (
                        <p className="text-xl font-semibold mb-2 w-full text-center text-red-500">
                            Failed to load images:{" "}
                            {`${loaderData.images.error.name} - ${loaderData.images.error.message}`}
                        </p>
                    ) : (
                        <TableGenerator data={images ?? []} config={IConfig} onSubmit={setImages} />
                    )}
                </div>
                <div className="p-4 rounded shadow">
                    <h2 className="text-xl font-semibold mb-2 w-full text-center">Users</h2>
                    {loaderData.users.error ? (
                        <p className="text-xl font-semibold mb-2 w-full text-center text-red-500">
                            Failed to load users: {`${loaderData.users.error.name} - ${loaderData.users.error.message}`}
                        </p>
                    ) : (
                        <TableGenerator data={users ?? []} config={UConfig} onSubmit={setUsers} />
                    )}
                </div>
                <div className="p-4 rounded shadow">
                    <h2 className="text-xl font-semibold mb-2 w-full text-center">Orders</h2>
                    {loaderData.orders.error ? (
                        <p className="text-xl font-semibold mb-2 w-full text-center text-red-500">
                            Failed to load orders:{" "}
                            {`${loaderData.orders.error.name} - ${loaderData.orders.error.message}`}
                        </p>
                    ) : (
                        <TableGenerator data={orders ?? []} config={OConfig} onSubmit={setOrders} />
                    )}
                </div>
                <div className="p-4 rounded shadow">
                    <h2 className="text-xl font-semibold mb-2 w-full text-center">Paypal Transactions</h2>
                    {loaderData.transactions.error ? (
                        <p className="text-xl font-semibold mb-2 w-full text-center text-red-500">
                            Failed to load transactions:{" "}
                            {`${loaderData.transactions.error.name} - ${loaderData.transactions.error.message}`}
                        </p>
                    ) : (
                        <TableGenerator data={transactions ?? []} config={TConfig} onSubmit={setTransactions} />
                    )}
                </div>
                <div className="p-4 rounded shadow">
                    <h2 className="text-xl font-semibold mb-2 w-full text-center">Password Reset Tokens</h2>
                    {loaderData.resetTokens.error ? (
                        <p className="text-xl font-semibold mb-2 w-full text-center text-red-500">
                            Failed to load tokens:{" "}
                            {`${loaderData.resetTokens.error.name} - ${loaderData.resetTokens.error.message}`}
                        </p>
                    ) : (
                        <TableGenerator data={resetTokens ?? []} config={RTConfig} onSubmit={setResetTokens} />
                    )}
                </div>
                <div className="p-4 rounded shadow">
                    <h2 className="text-xl font-semibold mb-2 w-full text-center">Email Verification Tokens</h2>
                    {loaderData.verifyTokens.error ? (
                        <p className="text-xl font-semibold mb-2 w-full text-center text-red-500">
                            Failed to load tokens:{" "}
                            {`${loaderData.verifyTokens.error.name} - ${loaderData.verifyTokens.error.message}`}
                        </p>
                    ) : (
                        <TableGenerator data={verifyTokens ?? []} config={VTConfig} onSubmit={setVerifyTokens} />
                    )}
                </div>
            </div>
        </div>
    );
}

export const handle: PageHandle<Route.ComponentProps["loaderData"]> = {
    breadcrumb: ({ pathname }) => ({
        pathname,
        name: "Admin",
    }),
};
