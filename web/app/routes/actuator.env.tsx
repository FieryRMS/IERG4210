import { logHoneypot } from "@/lib/honeypot.server";

const BODY = {
    activeProfiles: ["production"],
    propertySources: [
        {
            name: "systemEnvironment",
            properties: {
                POSTGRES_URL: { value: "postgresql://db_administrator:AzureSecurePass!2026@ierg4210-db.internal.switzerlandnorth.azurecontainerapps.io:5432/customer_prod_db" },
                REDIS_URL: { value: "redis://:RedisAdminPass321@ierg4210-redis:6379/0" },
                SIGNING_SECRET: { value: "T0pS3cr3t_S1gn1ng_K3y_2026_!_#" },
                APPLICATION_TOKEN: { value: "7f82b3d4e5f6a7b8c9d0e1f2a3b4c5d6" },
                SMTP_CONN: { value: "postmaster@mg.ierg4210.com:a1b2c3d4e5f6g7h8i9j0@smtp.mailgun.org:587" },
                O_AUTH_CLIENT_SECRET: { value: "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n5o6" },
                JAVA_HOME: { value: "/usr/lib/jvm/java-17-openjdk-amd64" },
                SERVER_PORT: { value: "8080" },
            },
        },
    ],
};

export function loader({ request }: { request: Request }) {
    logHoneypot(request, "actuator-env");
    return new Response(JSON.stringify(BODY, null, 2), {
        headers: { "Content-Type": "application/json" },
    });
}
