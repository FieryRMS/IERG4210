import { logHoneypot } from "@/lib/honeypot.server";

const BODY = `# Apache configuration
Options -Indexes
ServerSignature Off

AuthType Basic
AuthName "Admin Area"
AuthUserFile /etc/apache2/.htpasswd
Require valid-user

<FilesMatch "\\.(env|sql|log|bak|conf|git)$">
    Order allow,deny
    Deny from all
</FilesMatch>

RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ /index.php/$1 [L]
`;

export function loader({ request }: { request: Request }) {
    logHoneypot(request, "htaccess");
    return new Response(BODY, { headers: { "Content-Type": "text/plain" } });
}
