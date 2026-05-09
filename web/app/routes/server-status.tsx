import { logHoneypot } from "@/lib/honeypot.server";

const BODY = `<!DOCTYPE html>
<html><head><title>Apache Status</title>
<style>body{font-family:monospace;font-size:13px;margin:20px}h1{font-size:18px}table{border-collapse:collapse}td,th{border:1px solid #aaa;padding:4px 8px}th{background:#e0e0e0}</style>
</head><body>
<h1>Apache Server Status for ierg4210.agreeableplant-7d6a2c98.switzerlandnorth.azurecontainerapps.io</h1>
<p>Server Version: Apache/2.4.57 (Debian) OpenSSL/3.0.11 PHP/8.1.28</p>
<p>Server MPM: event</p>
<p>Server Built: 2024-04-12T07:22:01</p>
<hr/>
<p>Current Time: Fri, 09 May 2026 03:14:07 GMT</p>
<p>Restart Time: Wed, 07 May 2026 01:00:00 GMT</p>
<p>Parent Server Config. Generation: 1</p>
<p>Server uptime: 2 days 2 hours 14 minutes 7 seconds</p>
<p>Total accesses: 58291 - Total Traffic: 1.2 GB</p>
<p>CPU Usage: u4.3 s1.2 cu0 cs0 - .00285% CPU load</p>
<p>6.78 requests/sec - 14.8 kB/second - 21.8 kB/request</p>
<p>3 requests currently being processed, 5 idle workers</p>
<pre>__W_._WW_..........................................................................
...................................................................</pre>
<table>
<tr><th>Srv</th><th>PID</th><th>Acc</th><th>M</th><th>CPU</th><th>SS</th><th>Req</th><th>Conn</th><th>Client</th><th>VHost</th><th>Request</th></tr>
<tr><td>0-0</td><td>18</td><td>0/1423/1423</td><td>W</td><td>0.04</td><td>0</td><td>0</td><td>0.0</td><td>10.0.0.1</td><td>ierg4210.agreeableplant-7d6a2c98.switzerlandnorth.azurecontainerapps.io</td><td>GET /server-status HTTP/1.1</td></tr>
<tr><td>1-0</td><td>19</td><td>0/892/892</td><td>W</td><td>0.02</td><td>1</td><td>12</td><td>0.1</td><td>10.0.0.2</td><td>ierg4210.agreeableplant-7d6a2c98.switzerlandnorth.azurecontainerapps.io</td><td>POST /api/checkout HTTP/1.1</td></tr>
<tr><td>2-0</td><td>20</td><td>0/341/341</td><td>_</td><td>0.01</td><td>5</td><td>0</td><td>0.0</td><td>10.0.0.3</td><td>ierg4210.agreeableplant-7d6a2c98.switzerlandnorth.azurecontainerapps.io</td><td>GET /api/products HTTP/1.1</td></tr>
</table>
</body></html>`;

export function loader({ request }: { request: Request }) {
    logHoneypot(request, "server-status");
    return new Response(BODY, { headers: { "Content-Type": "text/html" } });
}
