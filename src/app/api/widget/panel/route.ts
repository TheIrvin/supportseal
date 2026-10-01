import { NextResponse, type NextRequest } from "next/server";

import { loadWidgetProduct, serviceOriginFrom } from "@/lib/widget";

export const dynamic = "force-dynamic";

/**
 * The widget panel, served as a dependency-free HTML document from the
 * SupportSeal origin and embedded in an iframe by the loader. Loads no fonts
 * and no dashboard bundle (docs/design/chat-widget.md).
 */
export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key") ?? "";
  const host = request.nextUrl.searchParams.get("host") ?? "";
  const product = await loadWidgetProduct(key);
  const frameAncestors = buildFrameAncestors(product, serviceOriginFrom(request.headers, request.nextUrl.origin));

  const html = PANEL_HTML.replace("__KEY__", escapeAttr(key)).replace("__HOST__", escapeAttr(host));
  return new NextResponse(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "content-security-policy":
        `default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; frame-ancestors ${frameAncestors}`,
    },
  });
}

/**
 * Only allowlisted sites (plus the service itself, for the in-app preview)
 * may frame the panel. Wildcard domains map to CSP host wildcards.
 */
function buildFrameAncestors(
  product: { domains: string[] } | null,
  serviceOrigin: string,
): string {
  const ancestors = new Set<string>(["'self'", serviceOrigin]);
  const addHttpAndHttps = (host: string) => {
    ancestors.add(`https://${host}`);
    ancestors.add(`http://${host}`);
  };
  // Explicit localhost development path (FR-CHAT-01): port wildcards, http only.
  const addLocalDev = () => {
    ancestors.add("http://localhost:*");
    ancestors.add("http://127.0.0.1:*");
  };
  if (process.env.NODE_ENV !== "production") addLocalDev();
  for (const pattern of product?.domains ?? []) {
    const rule = pattern.trim().toLowerCase();
    if (rule.startsWith("*.")) addHttpAndHttps(`*.${rule.slice(2)}`);
    else if (rule === "localhost" || rule === "127.0.0.1") addLocalDev();
    else addHttpAndHttps(rule);
  }
  return [...ancestors].join(" ");
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

const PANEL_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Chat</title>
<style>
  :root { font-synthesis: none; }
  * { box-sizing: border-box; margin: 0; }
  html, body { height: 100%; }
  body { font: 15px/1.45 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #43544D; background: #fff; display: flex; flex-direction: column; }
  header { padding: 16px 20px; color: #fff; }
  header h1 { font-size: 17px; font-weight: 600; color: #fff; }
  .status { display: flex; align-items: center; gap: 6px; font-size: 13px; margin-top: 2px; opacity: .95; }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: #3DDC97; display: inline-block; }
  .dot.away { background: #8FA19A; }
  .pill { margin-left: auto; font-size: 11px; padding: 2px 8px; border-radius: 999px; background: rgba(255,255,255,.22); }
  .close { position: absolute; top: 14px; right: 14px; background: none; border: none; color: #fff; font-size: 20px; cursor: pointer; line-height: 1; display: none; }
  @media (max-width: 639px) { .close { display: block; } }
  #thread { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 8px; overscroll-behavior: contain; }
  .msg { max-width: 82%; padding: 10px 12px; border-radius: 12px; font-size: 14px; white-space: pre-wrap; word-break: break-word; }
  .msg.customer { align-self: flex-end; border-bottom-right-radius: 4px; }
  .msg.agent { align-self: flex-start; background: #EFF4F2; color: #15261F; border-bottom-left-radius: 4px; }
  .msg .who { font-size: 11px; opacity: .8; margin-bottom: 2px; }
  .msg.pending { opacity: .55; }
  .msg.error { outline: 1px solid #C42B2B; }
  .retry { color: #C42B2B; background: none; border: none; font-size: 12px; cursor: pointer; padding: 0; margin-top: 4px; font-weight: 600; }
  .day { align-self: center; font-size: 11px; color: #5F6F69; padding: 4px 0; }
  .sysline { align-self: center; font-size: 12px; color: #5F6F69; text-align: center; max-width: 90%; }
  .card { align-self: stretch; border: 1px solid #DCE5E1; border-radius: 10px; padding: 12px; font-size: 13px; }
  .card p { margin-bottom: 8px; color: #15261F; font-weight: 500; }
  .card .row { display: flex; gap: 8px; }
  input, textarea, button { font: inherit; }
  .field { flex: 1; border: 1px solid #7A8B85; border-radius: 8px; padding: 8px 10px; font-size: 14px; }
  .btn { border: none; border-radius: 8px; padding: 8px 14px; font-weight: 600; cursor: pointer; color: #fff; }
  .btn.secondary { background: none; color: #5F6F69; border: 1px solid #DCE5E1; }
  .linkbtn { background: none; border: none; color: #5F6F69; font-size: 12px; cursor: pointer; margin-top: 6px; }
  #away { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
  #away label { font-size: 13px; font-weight: 500; color: #15261F; display: block; margin-bottom: 4px; }
  #away textarea { width: 100%; resize: none; }
  .hint { font-size: 12px; color: #C42B2B; min-height: 14px; }
  #composer { display: flex; gap: 8px; padding: 12px 16px calc(12px + env(safe-area-inset-bottom)); border-top: 1px solid #DCE5E1; align-items: flex-end; }
  #composer textarea { flex: 1; resize: none; border: 1px solid #7A8B85; border-radius: 10px; padding: 10px 12px; font-size: 16px; max-height: 132px; }
  #send { border: none; border-radius: 10px; width: 40px; height: 40px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
  #send svg { width: 18px; height: 18px; }
  .banner { padding: 8px 16px; font-size: 12px; background: #EFF4F2; color: #43544D; display: none; }
  .diagnotice { padding: 6px 16px; font-size: 12px; color: #5F6F69; background: #F6F9F8; border-bottom: 1px solid #DCE5E1; }
  .diagnotice button, .diaglist button { background: none; border: none; color: #5F6F69; text-decoration: underline; cursor: pointer; font-size: 12px; padding: 0; }
  .diaglist { display: none; padding: 6px 16px 8px; font-size: 11px; line-height: 1.5; color: #5F6F69; background: #F6F9F8; border-bottom: 1px solid #DCE5E1; }
  .diaglist.open { display: block; }
  #away .diagnotice { border: none; background: none; padding: 0; }
</style>
</head>
<body>
  <header id="header">
    <h1 id="title">Chat</h1>
    <div class="status"><span class="dot" id="dot"></span><span id="statusline"></span><span class="pill" id="testmode" style="display:none">Test mode</span></div>
    <button class="close" id="closeBtn" aria-label="Close chat">&#10005;</button>
  </header>
  <div class="banner" id="banner">We can't reach support right now. <button class="retry" id="retryBtn">Retry</button></div>
  <div id="thread" role="log" aria-live="polite"></div>
  <form id="away" style="display:none" novalidate>
    <div>
      <label for="email">Email</label>
      <input class="field" id="email" type="email" name="email" autocomplete="email" required>
    </div>
    <div>
      <label for="message">Message</label>
      <textarea class="field" id="message" rows="5" required></textarea>
    </div>
    <div class="hint" id="awayHint"></div>
    <button class="btn" id="awaySend" type="submit">Send message</button>
  </form>
  <div id="composer" style="display:none">
    <div id="chips" style="display:none;flex-wrap:wrap;gap:6px;padding:8px 16px 0"></div>
    <div style="display:flex;gap:8px;padding:12px 16px calc(12px + env(safe-area-inset-bottom));border-top:1px solid #DCE5E1;align-items:flex-end">
      <input type="file" id="fileInput" multiple hidden>
      <button id="attach" aria-label="Attach a file" style="background:none;border:none;cursor:pointer;padding:8px;color:#43544D"></button>
      <textarea id="input" rows="1" placeholder="Write a message…" aria-label="Write a message"></textarea>
      <button id="send" aria-label="Send message"></button>
    </div>
  </div>
<script>
(function () {
  var params = new URLSearchParams(window.location.search);
  var key = params.get('key') || '';
  var testToken = params.get('testToken') || '';
  var hostOrigin = params.get('host') || '';
  var previewMode = params.get('preview') === '1';
  var hostPath = '/';
  var accent = '#2563eb';
  var inkOnAccent = '#fff';
  var config = null;
  var state = { messages: [], email: null, conversationId: null };
  // Attachment tiles are built with DOM APIs + textContent so untrusted
  // filenames can never enter an HTML context (defence-in-depth on top of
  // the server-side filename allowlist).
  function attachmentNodes(list) {
    var nodes = [];
    if (!list) return nodes;
    list.forEach(function (a) {
      var url = '/api/attachments/' + a.id + '?key=' + encodeURIComponent(key);
      var link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener';
      if (a.contentType && a.contentType.indexOf('image/') === 0) {
        link.style.cssText = 'display:block;margin-top:6px';
        var img = document.createElement('img');
        img.src = url;
        img.alt = a.filename;
        img.style.cssText = 'max-width:200px;max-height:160px;border-radius:8px;display:block;border:1px solid #DCE5E1';
        link.appendChild(img);
      } else {
        link.style.cssText = 'display:inline-flex;align-items:center;gap:6px;margin-top:6px;border:1px solid #DCE5E1;border-radius:8px;padding:6px 10px;font-size:12px;color:#15261F;text-decoration:none';
        link.textContent = '\ud83d\udcc4 ' + a.filename + ' (' + formatSize(a.size) + ')';
      }
      nodes.push(link);
    });
    return nodes;
  }
  var lastCount = 0;
  var pollTimer = null;
  var hidden = true;

  var thread = document.getElementById('thread');
  var input = document.getElementById('input');
  var sendBtn = document.getElementById('send');
  var awayForm = document.getElementById('away');
  var attachBtn = document.getElementById('attach');
  var fileInput = document.getElementById('fileInput');
  var chipsEl = document.getElementById('chips');
  var pendingAttachments = [];
  if (attachBtn) attachBtn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>';

  function renderChips() {
    if (!chipsEl) return;
    chipsEl.innerHTML = '';
    chipsEl.style.display = pendingAttachments.length ? 'flex' : 'none';
    pendingAttachments.forEach(function (a, index) {
      var chip = document.createElement('span');
      chip.style.cssText = 'display:inline-flex;align-items:center;gap:4px;border:1px solid #DCE5E1;border-radius:8px;padding:3px 8px;font-size:12px;color:#15261F';
      chip.innerHTML = '<span></span><button type="button" aria-label="Remove attachment" style="background:none;border:none;cursor:pointer;color:#5F6F69;padding:0;line-height:1">\u00d7</button>';
      chip.firstChild.textContent = a.filename + ' (' + formatSize(a.size) + ')';
      chip.querySelector('button').addEventListener('click', function () {
        pendingAttachments.splice(index, 1);
        renderChips();
      });
      chipsEl.appendChild(chip);
    });
  }
  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return Math.round(bytes / 1024) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }
  if (attachBtn && fileInput) {
    attachBtn.addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', function () {
      var files = Array.prototype.slice.call(fileInput.files);
      fileInput.value = '';
      files.forEach(function (file) {
        var body = new FormData();
        body.append('file', file);
        apiFetch('/api/widget/attachments', { method: 'POST', body: body })
          .then(function (r) { return r.json(); })
          .then(function (data) {
            if (data.attachment) { pendingAttachments.push(data.attachment); renderChips(); }
            else {
              var hint = document.createElement('p');
              hint.className = 'sysline';
              hint.textContent = data.error || 'Upload failed.';
              thread.appendChild(hint);
              setTimeout(function () { hint.remove(); }, 3000);
            }
          })
          .catch(function () {});
      });
    });
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function autoContrast(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return '#fff';
    var c = m[1];
    function lin(x) { return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }
    var l = 0.2126 * lin(parseInt(c.slice(0, 2), 16) / 255) + 0.7152 * lin(parseInt(c.slice(2, 4), 16) / 255) + 0.0722 * lin(parseInt(c.slice(4, 6), 16) / 255);
    return l > 0.35 ? '#000' : '#fff';
  }
  function apiUrl(path) {
    return path + '?key=' + encodeURIComponent(key) + '&host=' + encodeURIComponent(hostOrigin) + (testToken ? '&testToken=' + encodeURIComponent(testToken) : '');
  }

  // Visitor token fallback: third-party cookie blockers (Safari ITP) drop
  // the widget cookie inside the embedded panel. Keep the session token in
  // this iframe's (partitioned) sessionStorage and present it via header on
  // fetches and via t= on the EventSource stream. Cookie stays primary.
  var tokenKey = 'ss_token_' + key;
  function storedToken() {
    try { return sessionStorage.getItem(tokenKey) || ''; } catch (e) { return ''; }
  }
  function saveToken(value) {
    try { sessionStorage.setItem(tokenKey, value); } catch (e) { /* storage blocked: cookie path only */ }
  }
  function apiFetch(path, options) {
    options = options || {};
    options.credentials = 'include';
    options.headers = Object.assign({}, options.headers || {});
    var token = storedToken();
    if (token) options.headers['x-ss-visitor-token'] = token;
    return fetch(apiUrl(path), options);
  }
  function pageUrl() {
    try { return new URL(hostOrigin).origin + hostPath; } catch (e) { return hostOrigin + hostPath; }
  }

  // Diagnostics transport (docs/design/diagnostics.md): when the visitor
  // sends a message, ask the loader for a snapshot and wait at most 250 ms.
  // No reply or an empty buffer sends the message without diagnostics —
  // diagnostics never block a message beyond that wait.
  function requestDiagnostics() {
    if (!config || !config.diagnostics) return Promise.resolve(null);
    return new Promise(function (resolve) {
      var settled = false;
      function onMessage(event) {
        if (event.source !== window.parent) return;
        var data = event.data || {};
        if (data.type !== 'ss:diag-snapshot') return;
        finish(data.snapshot || null);
      }
      function finish(value) {
        if (settled) return;
        settled = true;
        window.removeEventListener('message', onMessage);
        clearTimeout(timer);
        resolve(value);
      }
      var timer = setTimeout(function () { finish(null); }, 250);
      window.addEventListener('message', onMessage);
      parent.postMessage({ type: 'ss:diag-request' }, '*');
    });
  }

  // One muted disclosure line above the composer and on the away form while
  // the Product has diagnostics enabled. Placeholder copy pending legal.
  function renderDiagNotice() {
    if (document.getElementById('diagNotice')) return;
    var notice = document.createElement('div');
    notice.className = 'diagnotice';
    notice.id = 'diagNotice';
    var text = document.createElement('span');
    text.textContent = 'Technical details from this page are shared with ' + (config ? config.name : 'this') + ' support. ';
    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.textContent = "What's collected";
    notice.appendChild(text);
    notice.appendChild(toggle);
    var list = document.createElement('div');
    list.className = 'diaglist';
    list.id = 'diagList';
    var collected = document.createElement('p');
    collected.textContent = 'Collected when you send a message: JavaScript errors, warnings and failed network requests, this page\\u2019s address, and your browser and screen size.';
    var never = document.createElement('p');
    never.textContent = 'Never collected: passwords, payment details, cookies, form contents, anything you type, or anything from other sites.';
    list.appendChild(collected);
    list.appendChild(never);
    toggle.addEventListener('click', function () {
      var openNow = list.classList.toggle('open');
      toggle.setAttribute('aria-expanded', openNow ? 'true' : 'false');
      toggle.textContent = openNow ? 'Hide details' : "What's collected";
    });
    var composer = document.getElementById('composer');
    if (composer && composer.parentNode) composer.parentNode.insertBefore(notice, composer);
    if (composer && composer.parentNode) composer.parentNode.insertBefore(list, composer);
    var away = document.getElementById('away');
    if (away) {
      var awayNotice = notice.cloneNode(true);
      awayNotice.id = 'awayDiagNotice';
      var awayToggle = awayNotice.querySelector('button');
      var awayList = list.cloneNode(true);
      awayList.id = 'awayDiagList';
      if (awayToggle) awayToggle.addEventListener('click', function () {
        var openNow = awayList.classList.toggle('open');
        if (awayToggle) awayToggle.setAttribute('aria-expanded', openNow ? 'true' : 'false');
      });
      away.insertBefore(awayList, away.firstChild);
      away.insertBefore(awayNotice, away.firstChild);
    }
  }

  function applyConfig(data) {
    config = data;
    accent = data.color || accent;
    inkOnAccent = autoContrast(accent);
    document.getElementById('header').style.background = accent;
    document.getElementById('title').textContent = data.name;
    sendBtn.style.background = accent;
    sendBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="' + inkOnAccent + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/></svg>';
    var away = data.availability === 'AWAY';
    document.getElementById('dot').className = 'dot' + (away ? ' away' : '');
    document.getElementById('statusline').textContent = away
      ? 'Away · Send us a message, we\\u2019ll reply by email'
      : 'Online · Chat with us';
    try {
      var h = new URL(hostOrigin).hostname;
      if (h === 'localhost' || h === '127.0.0.1') document.getElementById('testmode').style.display = 'inline-block';
    } catch (e) {}
    if (data.diagnostics) renderDiagNotice();
  }

  function render() {
    thread.innerHTML = '';
    if (state.messages.length === 0 && config && config.availability !== 'AWAY') {
      var p = document.createElement('p');
      p.className = 'sysline';
      p.textContent = 'Ask us anything, we\\u2019re here.';
      thread.appendChild(p);
    }
    var lastDay = '';
    state.messages.forEach(function (m, i) {
      var day = new Date(m.createdAt).toDateString();
      if (day !== lastDay) {
        lastDay = day;
        var d = document.createElement('p');
        d.className = 'day';
        d.textContent = new Date(m.createdAt).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
        thread.appendChild(d);
      }
      var el = document.createElement('div');
      el.className = 'msg ' + (m.kind === 'CUSTOMER' ? 'customer' : 'agent');
      if (m.kind === 'CUSTOMER') { el.style.background = accent; el.style.color = inkOnAccent; }
      var who = document.createElement('div');
      who.className = 'who';
      who.textContent = m.kind === 'CUSTOMER' ? '' : (config ? config.name : '') + ' Support';
      if (who.textContent) el.appendChild(who);
      var body = document.createElement('div');
      body.textContent = m.body;
      el.appendChild(body);
      var attachmentNodesForMessage = attachmentNodes(m.attachments);
      if (attachmentNodesForMessage.length > 0) {
        var files = document.createElement('div');
        attachmentNodesForMessage.forEach(function (node) { files.appendChild(node); });
        el.appendChild(files);
      }
      thread.appendChild(el);
    });
    if (state.email) {
      var s = document.createElement('p');
      s.className = 'sysline';
      s.textContent = 'We\\u2019ll email ' + state.email + ' if you\\u2019ve left.';
      thread.appendChild(s);
    } else if (state.messages.length > 0 && config && config.availability !== 'AWAY') {
      renderEmailCapture();
    }
    thread.scrollTop = thread.scrollHeight;
    renderModes();
  }

  function renderEmailCapture() {
    var card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = '<p>Get replies by email if you leave</p>' +
      '<div class="row"><input class="field" id="captureEmail" type="email" placeholder="you@example.com" aria-label="Email address">' +
      '<button class="btn" type="button" id="captureSave">Save</button></div>' +
      '<button class="linkbtn" type="button" id="captureNo">No thanks</button>';
    thread.appendChild(card);
    card.querySelector('#captureSave').addEventListener('click', function () { saveEmail(card.querySelector('#captureEmail').value, card); });
    card.querySelector('#captureNo').addEventListener('click', function () { card.remove(); });
  }

  function renderModes() {
    var away = config && config.availability === 'AWAY';
    var showAway = away && state.messages.length === 0;
    awayForm.style.display = showAway ? 'flex' : 'none';
    document.getElementById('composer').style.display = showAway ? 'none' : 'flex';
    if (!showAway) {
      document.getElementById('emailHint') && document.getElementById('emailHint').remove();
      if (away && !state.email) {
        var hint = document.createElement('div');
        hint.id = 'emailHint';
        hint.className = 'sysline';
        hint.style.padding = '0 16px 8px';
        hint.textContent = 'We\\u2019re away — leave your email so we can reply.';
        document.getElementById('composer').before(hint);
      }
    }
  }

  function saveEmail(email, cardEl) {
    if (previewMode) {
      return new Promise(function (resolve) {
        setTimeout(function () {
          state.email = email;
          if (cardEl) cardEl.remove();
          render();
          resolve({ email: email });
        }, 300);
      });
    }
    return apiFetch('/api/widget/messages', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: email })
    }).then(function (r) { return r.json(); }).then(function (data) {
      if (data.email) {
        state.email = data.email;
        if (cardEl) cardEl.remove();
        render();
      } else if (cardEl) {
        var hint = cardEl.querySelector('.hint');
        if (!hint) { hint = document.createElement('div'); hint.className = 'hint'; cardEl.appendChild(hint); }
        hint.textContent = data.error || 'Enter a valid email address.';
      }
      return data;
    });
  }

  function flushDevQueue() {
    booted = true;
    while (devQueue.length) {
      var item = devQueue.shift();
      pushDeveloperData(item[0], item[1]);
    }
  }

  function persistToken(data) {
    // Only a newly issued token is stored; session echo for an existing
    // visitor carries no token and must not clobber the stored one.
    if (data && data.token) saveToken(data.token);
  }

  function boot() {
    if (previewMode) {
      booted = true;
      applyConfig({
        name: params.get('name') || 'Support',
        color: params.get('color') || '#2563eb',
        availability: params.get('availability') === 'AWAY' ? 'AWAY' : 'LIVE'
      });
      render();
      return Promise.resolve();
    }
    return apiFetch('/api/widget/session', { method: 'POST' })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (data) {
        persistToken(data);
        applyConfig(data);
        state.email = data.session && data.session.email;
        state.conversationId = data.thread && data.thread.conversationId;
        state.messages = (data.thread && data.thread.messages) || [];
        lastCount = state.messages.length;
        render();
        flushDevQueue();
      })
      .catch(function () { document.getElementById('banner').style.display = 'block'; });
  }

  function poll() {
    if (previewMode || document.hidden) { reportUnread(); return; }
    apiFetch('/api/widget/messages', {})
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !data.thread) return;
        var prev = state.messages;
        var incoming = data.thread.messages || [];
        var changed = prev.length !== incoming.length ||
          (incoming.length > 0 && !prev.some(function (m) { return m.id === incoming[incoming.length - 1].id; }));
        if (changed) {
          state.messages = incoming;
          state.conversationId = data.thread.conversationId;
          if (!hidden) render();
          reportUnread();
        }
        lastCount = hidden ? lastCount : incoming.length;
      })
      .catch(function () {});
  }

  function reportUnread() {
    if (hidden && state.messages.length > lastCount) {
      parent.postMessage({ type: 'ss:unread', count: state.messages.length - lastCount }, '*');
    }
  }


  function send() {
    var body = input.value.trim();
    if (!body && pendingAttachments.length === 0) return;
    if (!body) body = '(attachment)';
    input.value = '';
    input.style.height = 'auto';
    sendBtn.disabled = true;
    var attachmentIds = pendingAttachments.map(function (a) { return a.id; });
    pendingAttachments = [];
    renderChips();
    if (previewMode) {
      sendBtn.disabled = false;
      state.messages.push({ id: 'p' + Date.now(), kind: 'CUSTOMER', body: body, createdAt: new Date().toISOString() });
      render();
      setTimeout(function () {
        state.messages.push({ id: 'a' + Date.now(), kind: 'AGENT', body: 'Thanks! This is a preview — replies from your team will appear here.', createdAt: new Date().toISOString() });
        render();
      }, 900);
      return;
    }
    requestDiagnostics().then(function (diagnostics) {
      var payload = { body: body, pageUrl: pageUrl(), attachmentIds: attachmentIds };
      if (diagnostics) payload.diagnostics = diagnostics;
      return apiFetch('/api/widget/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });
    })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
      .then(function (result) {
        sendBtn.disabled = false;
        if (result.ok && result.data.thread) {
          state.messages = result.data.thread.messages || [];
          render();
          // The stream needs an existing conversation; if we started on
          // polling (no conversation yet), upgrade now.
          if (!streamActive && !previewMode) startStream();
        } else {
          input.value = body;
          if (result.data.error === 'rate_limited') {
            var hint = document.createElement('p');
            hint.className = 'sysline';
            hint.textContent = 'You\\u2019re sending messages too quickly. Try again in a moment.';
            hint.id = 'rlHint';
            var old = document.getElementById('rlHint'); if (old) old.remove();
            thread.appendChild(hint); thread.scrollTop = thread.scrollHeight;
            setTimeout(function () { hint.remove(); }, 2500);
          }
        }
      })
      .catch(function () {
        sendBtn.disabled = false;
        input.value = body;
        document.getElementById('banner').style.display = 'block';
      });
  }

  sendBtn.addEventListener('click', send);
  input.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(); }
  });
  input.addEventListener('input', function () {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 132) + 'px';
  });

  awayForm.addEventListener('submit', function (event) {
    event.preventDefault();
    var email = document.getElementById('email').value.trim();
    var message = document.getElementById('message').value.trim();
    var hint = document.getElementById('awayHint');
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) { hint.textContent = 'Enter a valid email address so we can reply.'; return; }
    if (!message) { hint.textContent = 'Write a short message so we know how to help.'; return; }
    hint.textContent = '';
    document.getElementById('awaySend').disabled = true;
    saveEmail(email).then(function () {
      if (previewMode) {
        state.messages.push({ id: 'p' + Date.now(), kind: 'CUSTOMER', body: message, createdAt: new Date().toISOString() });
        render();
        return;
      }
      input.dataset.awayMessage = '';
      return requestDiagnostics().then(function (diagnostics) {
        var payload = { body: message, pageUrl: pageUrl() };
        if (diagnostics) payload.diagnostics = diagnostics;
        return apiFetch('/api/widget/messages', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }).then(function (r) { return r.json(); }).then(function (data) {
        document.getElementById('awaySend').disabled = false;
        if (data.thread) { state.messages = data.thread.messages || []; render(); }
        if (!streamActive && !previewMode) startStream();
      });
    });
  });

  document.getElementById('closeBtn').addEventListener('click', function () {
    parent.postMessage({ type: 'ss:close' }, '*');
  });
  document.getElementById('retryBtn').addEventListener('click', function () {
    document.getElementById('banner').style.display = 'none';
    boot();
  });

  var booted = false;
  var devQueue = [];
  // identify()/context()/pageUrl all merge into one stored JSON; serialize
  // the writes so concurrent PUTs cannot clobber each other.
  var devChain = Promise.resolve();
  function pushDeveloperData(kind, payload) {
    // Calls can arrive before the session exists; queue until boot resolves
    // so nothing is dropped (FR-CTX-01).
    if (!booted) {
      devQueue.push([kind, payload]);
      return;
    }
    var body = {};
    if (kind === 'identify') body.identify = payload;
    if (kind === 'context') body.context = payload;
    devChain = devChain.then(function () {
      return apiFetch('/api/widget/context', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body)
      });
    }).then(function (r) { return r.ok ? r.json() : null; }).then(function (data) {
      if (data && data.email) { state.email = data.email; render(); }
    }).catch(function () { /* silent: developer data is best-effort */ });
  }

  window.addEventListener('message', function (event) {
    // The loader runs in the host page, so event.origin is the host origin.
    // Only accept messages from our direct parent (the loader's iframe tag).
    if (event.source !== window.parent) return;
    var data = event.data || {};
    if (data.type === 'ss:page' && typeof data.path === 'string') hostPath = data.path;
    if (data.type === 'ss:open') { hidden = false; lastCount = state.messages.length; input.focus(); }
    if (data.type === 'ss:close') hidden = true;
    if (data.type === 'ss:identify') pushDeveloperData('identify', data.payload);
    if (data.type === 'ss:context') pushDeveloperData('context', data.payload);
  });

  boot().then(function () {
    startStream();
  });

  var streamActive = false;
  var activeSource = null;
  function startStream() {
    if (previewMode) { if (!pollTimer) pollTimer = setInterval(poll, 4000); return; }
    if (activeSource) { activeSource.close(); activeSource = null; }
    var after = state.messages.length
      ? state.messages[state.messages.length - 1].createdAt
      : new Date().toISOString();
    var source = new EventSource(apiUrl('/api/widget/stream') + '&after=' + encodeURIComponent(after));
    activeSource = source;
    streamActive = true;
    source.addEventListener('ready', function () {
      // The stream is established; stop the polling fallback if it ran.
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    });
    source.addEventListener('messages', function (event) {
      try {
        var incoming = JSON.parse(event.data);
        incoming.forEach(function (m) {
          if (!state.messages.some(function (x) { return x.id === m.id; })) state.messages.push(m);
        });
        state.messages.sort(function (a, b) {
          return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
        });
        if (!hidden) { render(); lastCount = state.messages.length; }
        reportUnread();
      } catch (e) { /* malformed frame: fall through to polling safety */ }
    });
    source.onerror = function () {
      if (source.readyState === EventSource.CLOSED) {
        source.close();
        if (activeSource === source) { activeSource = null; streamActive = false; }
        // Bounded polling fallback (ADR-0003) when the stream cannot hold.
        if (!pollTimer) pollTimer = setInterval(poll, 4000);
      }
    };
  }
})();
</script>
</body>
</html>`;
