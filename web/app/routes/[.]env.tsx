import { logHoneypot } from "@/lib/honeypot.server";
import type { Route } from "./+types/[.]env";

export function loader({ request }: Route.LoaderArgs) {
    logHoneypot(request, "dotenv");
    const honeypot = `
# Database Configuration
POSTGRES_DB=customer_prod_db
POSTGRES_USER=db_administrator
POSTGRES_PASSWORD=AzureSecurePass!2026
POSTGRES_URL=postgresql://db_administrator:AzureSecurePass!2026@ierg4210-db.internal.switzerlandnorth.azurecontainerapps.io:5432/customer_prod_db

# Application Environment
EXE_MODE=production
API_URL=https://api.ierg4210.agreeableplant-7d6a2c98.switzerlandnorth.azurecontainerapps.io
WEB_URL=https://ierg4210.agreeableplant-7d6a2c98.switzerlandnorth.azurecontainerapps.io
REDIS_URL=redis://:RedisAdminPass321@ierg4210-redis:6379/0
APPLICATION_TOKEN=7f82b3d4e5f6a7b8c9d0e1f2a3b4c5d6

# Mail Service
SMTP_CONN=postmaster@mg.ierg4210.com:a1b2c3d4e5f6g7h8i9j0@smtp.mailgun.org:587

# Security
SIGNING_SECRET=T0pS3cr3t_S1gn1ng_K3y_2026_!_#

# OAuth Credentials
VITE_O_AUTH_CLIENT_ID=483920184756-a1b2c3d4.apps.googleusercontent.com
O_AUTH_CLIENT_SECRET=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n5o6

# Payment Gateway
PAYPAL_API_BASE_URL=https://api-m.paypal.com
`;
    return new Response(honeypot, { headers: { "Content-Type": "text/plain" } });
}
