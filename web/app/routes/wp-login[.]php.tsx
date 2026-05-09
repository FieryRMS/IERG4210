import { logHoneypot } from "@/lib/honeypot.server";

const LOGIN_PAGE = `<!DOCTYPE html>
<html lang="en-US">
<head>
<meta charset="UTF-8" />
<title>Log In &lsaquo; IERG4210 Shop &#8212; WordPress</title>
<style>
body{background:#f1f1f1;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
#login{width:320px;margin:100px auto}
#login h1 a{display:block;text-align:center;margin-bottom:20px;font-size:20px;color:#3c434a;text-decoration:none}
.login label{font-size:14px;font-weight:600}
.login input[type=text],.login input[type=password]{width:100%;padding:8px;border:1px solid #8c8f94;border-radius:3px;box-sizing:border-box;margin-top:4px}
.login .button-primary{background:#2271b1;color:#fff;border:none;padding:10px;width:100%;cursor:pointer;font-size:14px;border-radius:3px}
#loginform{background:#fff;padding:26px;border-radius:3px;box-shadow:0 1px 3px rgba(0,0,0,.13)}
p.message{background:#fff;border:1px solid #c3c4c7;padding:12px;margin-bottom:20px;color:#d63638}
</style>
</head>
<body class="login">
<div id="login">
<h1><a href="/">IERG4210 Shop</a></h1>
<form name="loginform" id="loginform" action="/wp-login.php" method="post">
<p><label for="user_login">Username or Email Address<br><input type="text" name="log" id="user_login" autocomplete="username" value="" size="20" /></label></p>
<p><label for="user_pass">Password<br><input type="password" name="pwd" id="user_pass" autocomplete="current-password" size="20" /></label></p>
<input type="hidden" name="redirect_to" value="/wp-admin/" />
<input type="hidden" name="testcookie" value="1" />
<p class="submit"><input type="submit" name="wp-submit" id="wp-submit" class="button button-primary button-large" value="Log In" /></p>
</form>
</div>
</body>
</html>`;

const LOGIN_FAIL = `<!DOCTYPE html>
<html lang="en-US">
<head><meta charset="UTF-8" /><title>Log In &lsaquo; IERG4210 Shop &#8212; WordPress</title>
<style>body{background:#f1f1f1;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}#login{width:320px;margin:100px auto}#loginform{background:#fff;padding:26px;border-radius:3px;box-shadow:0 1px 3px rgba(0,0,0,.13)}.login label{font-size:14px;font-weight:600}.login input[type=text],.login input[type=password]{width:100%;padding:8px;border:1px solid #8c8f94;border-radius:3px;box-sizing:border-box;margin-top:4px}.login .button-primary{background:#2271b1;color:#fff;border:none;padding:10px;width:100%;cursor:pointer;font-size:14px;border-radius:3px}#login_error{background:#fff;border-left:4px solid #d63638;padding:12px;margin-bottom:20px;color:#d63638}</style>
</head>
<body class="login">
<div id="login">
<div id="login_error"><strong>Error</strong>: The password you entered for the username is incorrect. <a href="/wp-login.php?action=lostpassword">Lost your password?</a></div>
<form name="loginform" id="loginform" action="/wp-login.php" method="post">
<p><label for="user_login">Username or Email Address<br><input type="text" name="log" id="user_login" autocomplete="username" value="" size="20" /></label></p>
<p><label for="user_pass">Password<br><input type="password" name="pwd" id="user_pass" autocomplete="current-password" size="20" /></label></p>
<input type="hidden" name="redirect_to" value="/wp-admin/" />
<input type="hidden" name="testcookie" value="1" />
<p class="submit"><input type="submit" name="wp-submit" id="wp-submit" class="button button-primary button-large" value="Log In" /></p>
</form>
</div>
</body>
</html>`;

export function loader({ request }: { request: Request }) {
    logHoneypot(request, "wp-login-get");
    return new Response(LOGIN_PAGE, { headers: { "Content-Type": "text/html" } });
}

export async function action({ request }: { request: Request }) {
    const form = await request.formData();
    const username = (form.get("log") as string) ?? "";
    const password = (form.get("pwd") as string) ?? "";

    logHoneypot(request, "wp-login-post", { username, password_len: String(password.length) });
    return new Response(LOGIN_FAIL, { headers: { "Content-Type": "text/html" } });
}
