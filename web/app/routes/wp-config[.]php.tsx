import { logHoneypot } from "@/lib/honeypot.server";

const BODY = `<?php
/** The name of the database for WordPress */
define( 'DB_NAME', 'customer_prod_db' );

/** Database username */
define( 'DB_USER', 'db_administrator' );

/** Database password */
define( 'DB_PASSWORD', 'AzureSecurePass!2026' );

/** Database hostname */
define( 'DB_HOST', 'ierg4210-db.internal.switzerlandnorth.azurecontainerapps.io' );

/** Database charset to use in creating database tables. */
define( 'DB_CHARSET', 'utf8mb4' );

define( 'AUTH_KEY',         'q#Wz8!mP2@nL5$vR9^tY3&uJ6*oK1=sH' );
define( 'SECURE_AUTH_KEY',  'xB4#fD7@gE2!hC9^iA6&jN3*kM8=lQ5+' );
define( 'LOGGED_IN_KEY',    'yF1@zG4#aH7!bI2^cJ9&dK6*eL3=fM8+' );
define( 'NONCE_KEY',        'rS5#tT8@uU1!vV4^wW7&xX2*yY9=zZ6+' );

define( 'WP_DEBUG', false );
define( 'WP_HOME', 'https://ierg4210.agreeableplant-7d6a2c98.switzerlandnorth.azurecontainerapps.io' );
define( 'WP_SITEURL', 'https://ierg4210.agreeableplant-7d6a2c98.switzerlandnorth.azurecontainerapps.io' );

$table_prefix = 'wp_';

if ( ! defined( 'ABSPATH' ) ) {
    define( 'ABSPATH', __DIR__ . '/' );
}
require_once ABSPATH . 'wp-settings.php';
`;

export function loader({ request }: { request: Request }) {
    logHoneypot(request, "wp-config-php");
    return new Response(BODY, { headers: { "Content-Type": "text/plain" } });
}
