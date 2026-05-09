import { logHoneypot } from "@/lib/honeypot.server";

const XMLRPC_OK = `<?xml version="1.0" encoding="UTF-8"?>
<methodResponse>
  <params>
    <param>
      <value><string>WordPress/6.4.3</string></value>
    </param>
  </params>
</methodResponse>`;

const XMLRPC_INDEX = `<?xml version="1.0" encoding="UTF-8"?>
<html>
<head><title>XML-RPC server accepts POST requests only.</title></head>
<body><p>XML-RPC server accepts POST requests only.</p></body>
</html>`;

export function loader({ request }: { request: Request }) {
    logHoneypot(request, "xmlrpc-get");
    return new Response(XMLRPC_INDEX, {
        headers: { "Content-Type": "text/html", "X-Powered-By": "PHP/8.1.28" },
    });
}

export async function action({ request }: { request: Request }) {
    let body = "";
    try {
        body = await request.text();
    } catch {
        // ignore
    }

    // Extract the method name from the XML payload for richer logging
    const methodMatch = body.match(/<methodName>([^<]+)<\/methodName>/);
    const extra: Record<string, string> = {};
    if (methodMatch) extra.xml_method = methodMatch[1];
    if (body.length > 0) extra.body_len = String(body.length);

    // Flag brute-force multicall attempts
    if (body.includes("system.multicall")) extra.multicall = "detected";

    logHoneypot(request, "xmlrpc-post", extra);
    return new Response(XMLRPC_OK, {
        headers: { "Content-Type": "text/xml", "X-Powered-By": "PHP/8.1.28" },
    });
}
