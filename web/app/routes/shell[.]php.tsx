import { logHoneypot } from "@/lib/honeypot.server";

function shellPage(output?: string, cmd?: string) {
    return `<!DOCTYPE html>
<html><head><title>PHP Shell</title>
<style>
body{background:#1a1a1a;color:#00ff00;font-family:monospace;margin:20px}
input[type=text]{background:#000;color:#00ff00;border:1px solid #00ff00;padding:4px 8px;width:500px;font-family:monospace}
input[type=submit]{background:#003300;color:#00ff00;border:1px solid #00ff00;padding:4px 12px;cursor:pointer;font-family:monospace}
pre{background:#000;padding:12px;border:1px solid #333;min-height:60px;white-space:pre-wrap;word-break:break-all}
</style>
</head><body>
<b>PHP Shell v3.0.7</b> | uid=33(www-data) gid=33(www-data) groups=33(www-data) | PHP 8.1.28<br><br>
<form method="post">
<span style="color:#00cc00">www-data@ierg4210:/var/www/html$</span>&nbsp;
<input type="text" name="cmd" value="${cmd ? cmd.replace(/"/g, "&quot;") : ""}" autofocus />
<input type="submit" value="Run" />
</form>
<pre>${output ?? ""}</pre>
</body></html>`;
}

export function loader({ request }: { request: Request }) {
    logHoneypot(request, "webshell-get");
    return new Response(shellPage(), { headers: { "Content-Type": "text/html" } });
}

export async function action({ request }: { request: Request }) {
    const form = await request.formData();
    const cmd = ((form.get("cmd") as string) ?? "").trim();

    logHoneypot(request, "webshell-cmd", { cmd });

    // Return a plausible-looking error to keep them probing
    const output = cmd
        ? `sh: 1: ${cmd.split(" ")[0]}: Permission denied`
        : "";

    return new Response(shellPage(output, cmd), { headers: { "Content-Type": "text/html" } });
}
