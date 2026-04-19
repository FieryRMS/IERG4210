"use client";

import { sdk } from "@/lib/utils";
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";

export function meta() {
    return [{ title: "Verify Email | The Generic Company" }];
}

export default function VerifyEmailPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        navigate("/");
        const id = searchParams.get("id");
        const token = searchParams.get("token");

        if (!id || !token) {
            toast.error("Invalid verification link.");
            return;
        }

        sdk.users.postUsersVerifyEmail({ body: { id, token } }).then(({ error }) => {
            if (error) {
                toast.error(error.message ?? "Invalid or expired verification link.");
            } else {
                toast.success("Email verified! You can now sign in.");
            }
        });
    }, []);

    return null;
}
