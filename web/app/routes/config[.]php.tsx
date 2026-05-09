import { logHoneypot } from "@/lib/honeypot.server";

const BODY = `<?php
// Application Configuration
define('DB_HOST',     'ierg4210-db.internal.switzerlandnorth.azurecontainerapps.io');
define('DB_NAME',     'customer_prod_db');
define('DB_USER',     'db_administrator');
define('DB_PASS',     'AzureSecurePass!2026');
define('DB_PORT',     5432);

define('REDIS_HOST',  'ierg4210-redis');
define('REDIS_PORT',  6379);
define('REDIS_PASS',  'RedisAdminPass321');

define('APP_SECRET',  'T0pS3cr3t_S1gn1ng_K3y_2026_!_#');
define('APP_ENV',     'production');
define('APP_DEBUG',   false);

define('SMTP_HOST',   'smtp.mailgun.org');
define('SMTP_PORT',   587);
define('SMTP_USER',   'postmaster@mg.ierg4210.com');
define('SMTP_PASS',   'a1b2c3d4e5f6g7h8i9j0');
`;

export function loader({ request }: { request: Request }) {
    logHoneypot(request, "config-php");
    return new Response(BODY, { headers: { "Content-Type": "text/plain" } });
}
