import { logHoneypot } from "@/lib/honeypot.server";

const PMA_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>phpMyAdmin</title>
<style>
*{box-sizing:border-box}body{background:#f4f4f4;font-family:Arial,sans-serif;margin:0}
#pmacontainer{width:380px;margin:80px auto;background:#fff;border:1px solid #ccc;border-radius:4px;box-shadow:0 2px 6px rgba(0,0,0,.15)}
#pmaheader{background:#e8e8e8;padding:12px 20px;border-bottom:1px solid #ccc;display:flex;align-items:center;gap:10px}
#pmaheader span{font-size:18px;font-weight:bold;color:#4e6d8c}
#pmaheader small{color:#888;font-size:12px}
#pmabody{padding:24px}
label{display:block;font-size:13px;margin-bottom:2px;color:#555}
input[type=text],input[type=password],select{width:100%;padding:7px 10px;border:1px solid #bbb;border-radius:3px;font-size:13px;margin-bottom:14px}
input[type=submit]{background:#4e6d8c;color:#fff;border:none;padding:9px 20px;border-radius:3px;font-size:14px;cursor:pointer;width:100%}
input[type=submit]:hover{background:#3a5570}
.pma-error{background:#fce8e8;border:1px solid #e88;padding:10px;border-radius:3px;font-size:13px;color:#c00;margin-bottom:14px}
</style>
</head>
<body>
<div id="pmacontainer">
  <div id="pmaheader">
    <span>phpMyAdmin</span><small>5.2.1</small>
  </div>
  <div id="pmabody">
    <form method="post" action="/phpmyadmin">
      <label for="pma_username">Username:</label>
      <input type="text" name="pma_username" id="pma_username" autocomplete="username" />
      <label for="pma_password">Password:</label>
      <input type="password" name="pma_password" id="pma_password" autocomplete="current-password" />
      <label for="pma_db">Database:</label>
      <input type="text" name="pma_db" id="pma_db" value="" placeholder="(optional)" />
      <label for="lang">Language:</label>
      <select name="lang" id="lang"><option value="en">English</option></select>
      <input type="hidden" name="server" value="1" />
      <input type="submit" value="Go" />
    </form>
  </div>
</div>
</body>
</html>`;

const PMA_FAIL = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><title>phpMyAdmin</title>
<style>*{box-sizing:border-box}body{background:#f4f4f4;font-family:Arial,sans-serif;margin:0}#pmacontainer{width:380px;margin:80px auto;background:#fff;border:1px solid #ccc;border-radius:4px;box-shadow:0 2px 6px rgba(0,0,0,.15)}#pmaheader{background:#e8e8e8;padding:12px 20px;border-bottom:1px solid #ccc;display:flex;align-items:center;gap:10px}#pmaheader span{font-size:18px;font-weight:bold;color:#4e6d8c}#pmaheader small{color:#888;font-size:12px}#pmabody{padding:24px}label{display:block;font-size:13px;margin-bottom:2px;color:#555}input[type=text],input[type=password],select{width:100%;padding:7px 10px;border:1px solid #bbb;border-radius:3px;font-size:13px;margin-bottom:14px}input[type=submit]{background:#4e6d8c;color:#fff;border:none;padding:9px 20px;border-radius:3px;font-size:14px;cursor:pointer;width:100%}.pma-error{background:#fce8e8;border:1px solid #e88;padding:10px;border-radius:3px;font-size:13px;color:#c00;margin-bottom:14px}</style>
</head>
<body>
<div id="pmacontainer">
  <div id="pmaheader"><span>phpMyAdmin</span><small>5.2.1</small></div>
  <div id="pmabody">
    <div class="pma-error">#1698 - Access denied for user 'root'@'localhost'</div>
    <form method="post" action="/phpmyadmin">
      <label for="pma_username">Username:</label>
      <input type="text" name="pma_username" id="pma_username" autocomplete="username" />
      <label for="pma_password">Password:</label>
      <input type="password" name="pma_password" id="pma_password" autocomplete="current-password" />
      <label for="pma_db">Database:</label>
      <input type="text" name="pma_db" id="pma_db" value="" placeholder="(optional)" />
      <label for="lang">Language:</label>
      <select name="lang" id="lang"><option value="en">English</option></select>
      <input type="hidden" name="server" value="1" />
      <input type="submit" value="Go" />
    </form>
  </div>
</div>
</body>
</html>`;

export function loader({ request }: { request: Request }) {
    logHoneypot(request, "phpmyadmin-get");
    return new Response(PMA_PAGE, { headers: { "Content-Type": "text/html" } });
}

export async function action({ request }: { request: Request }) {
    const form = await request.formData();
    const username = (form.get("pma_username") as string) ?? "";
    const password = (form.get("pma_password") as string) ?? "";
    const db = (form.get("pma_db") as string) ?? "";

    logHoneypot(request, "phpmyadmin-post", { username, password_len: String(password.length), db });
    return new Response(PMA_FAIL, { headers: { "Content-Type": "text/html" } });
}
