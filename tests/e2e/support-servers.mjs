#!/usr/bin/env node
/**
 * E2E support servers, bundled in one process so Playwright can manage them
 * as a single webServer entry (readiness = the HTTP port answers).
 *
 *   HTTP :3101  /            widget host page — embeds the real widget script
 *                       for ?key=… against the app origin (?app=http://localhost:3000)
 *              /healthz     readiness probe
 *              /_smtp       captured outbound emails (JSON)
 *              /_smtp/reset empties the capture
 *   SMTP :1025  minimal catch server the app sends to via SMTP_URL
 */
import http from "node:http";
import net from "node:net";

const HTTP_PORT = Number(process.env.E2E_SUPPORT_PORT || 3101);
const SMTP_PORT = Number(process.env.E2E_SMTP_PORT || 1025);

const messages = [];

const HOST_PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>E2E host page</title>
<style>
  body { font: 16px/1.5 system-ui, sans-serif; max-width: 40rem; margin: 3rem auto; padding: 0 1rem; }
  h1 { font-size: 1.25rem; }
</style>
</head>
<body>
<h1>Customer site (E2E host page)</h1>
<p id="marker">host-page-marker</p>
<script>
(function () {
  var params = new URLSearchParams(window.location.search);
  var app = params.get("app") || "http://localhost:3000";
  var key = params.get("key");
  if (!key) return;
  var s = document.createElement("script");
  s.async = true;
  s.src = app + "/widget.js";
  s.dataset.key = key;
  document.body.appendChild(s);
})();
</script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://localhost:${HTTP_PORT}`);
  if (url.pathname === "/healthz") {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("ok");
    return;
  }
  if (url.pathname === "/_smtp" && req.method === "GET") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ messages }));
    return;
  }
  if (url.pathname === "/_smtp/reset" && req.method === "POST") {
    messages.length = 0;
    res.writeHead(200, { "content-type": "application/json" });
    res.end('{"ok":true}');
    return;
  }
  if (url.pathname === "/" && req.method === "GET") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(HOST_PAGE);
    return;
  }
  res.writeHead(404);
  res.end("not found");
});

server.listen(HTTP_PORT, "127.0.0.1");

/** Minimal SMTP receiver: EHLO/MAIL/RCPT/DATA/QUIT, no auth, no TLS. */
const smtp = net.createServer((socket) => {
  let buffer = "";
  let from = "";
  let recipients = [];
  let inData = false;

  const reply = (line) => socket.write(line + "\r\n");
  reply("220 e2e-smtp ready");

  socket.on("data", (chunk) => {
    buffer += chunk.toString("utf8");
    if (!inData) {
      let index = buffer.indexOf("\r\n");
      while (index !== -1) {
        const line = buffer.slice(0, index);
        buffer = buffer.slice(index + 2);
        if (line.toUpperCase() === "DATA") {
          inData = true;
          reply("354 End data with <CR><LF>.<CR><LF>");
          break;
        }
        handleCommand(line);
        index = buffer.indexOf("\r\n");
      }
    }
    if (inData) {
      const endIdx = buffer.indexOf("\r\n.\r\n");
      if (endIdx === -1) return;
      const data = buffer.slice(0, endIdx + 2);
      buffer = buffer.slice(endIdx + 5);
      inData = false;
      messages.push(parseMessage(from, recipients, data));
      if (messages.length > 100) messages.shift();
      from = "";
      recipients = [];
      reply("250 OK");
    }
  });

  function handleCommand(line) {
    const upper = line.toUpperCase();
    if (upper.startsWith("EHLO") || upper.startsWith("HELO")) {
      reply("250-e2e-smtp");
      reply("250 8BITMIME");
    } else if (upper.startsWith("MAIL FROM:")) {
      from = line.slice(10).trim().replace(/^<|>$/gu, "");
      reply("250 OK");
    } else if (upper.startsWith("RCPT TO:")) {
      recipients.push(line.slice(8).trim().replace(/^<|>$/gu, ""));
      reply("250 OK");
    } else if (upper === "QUIT") {
      reply("221 Bye");
      socket.end();
    } else if (upper === "RSET") {
      from = "";
      recipients = [];
      reply("250 OK");
    } else {
      reply("250 OK");
    }
  }

  socket.on("error", () => {});
});

function parseMessage(from, recipients, raw) {
  const separator = raw.indexOf("\r\n\r\n");
  const headerBlock = separator === -1 ? raw : raw.slice(0, separator);
  let body = separator === -1 ? "" : raw.slice(separator + 4);
  const headers = {};
  let lastKey = null;
  for (const line of headerBlock.split("\r\n")) {
    if (/^[ \t]/u.test(line) && lastKey) {
      headers[lastKey] += " " + line.trim();
      continue;
    }
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    lastKey = line.slice(0, colon).trim().toLowerCase();
    headers[lastKey] = line.slice(colon + 1).trim();
  }
  const encoding = (headers["content-transfer-encoding"] || "").trim().toLowerCase();
  if (encoding === "base64") {
    try {
      body = Buffer.from(body.replace(/\s/gu, ""), "base64").toString("utf8");
    } catch {}
  } else if (encoding === "quoted-printable") {
    body = body
      .replace(/=\r?\n/gu, "")
      .replace(/=([0-9A-Fa-f]{2})/gu, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    try {
      body = decodeURIComponent(escape(body));
    } catch {}
  }
  return {
    from,
    to: recipients,
    headers,
    subject: headers["subject"] || "",
    replyTo: headers["reply-to"] || "",
    messageId: headers["message-id"] || "",
    inReplyTo: headers["in-reply-to"] || "",
    references: headers["references"] || "",
    body,
    capturedAt: new Date().toISOString(),
  };
}

smtp.listen(SMTP_PORT, "127.0.0.1");

function shutdown() {
  server.close();
  smtp.close();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
