import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Widget loader: <script async src="{origin}/widget.js" data-key="pk_…"></script>
 * Served without Next's page runtime (plain JS string) so the host page never
 * downloads the dashboard bundle (Initial.md §55).
 */
export async function GET() {
  const js = LOADER_JS;
  return new NextResponse(js, {
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "public, max-age=300",
      "access-control-allow-origin": "*",
    },
  });
}

const LOADER_JS = String.raw`
(function () {
  if (window.__supportsealWidget) return;
  window.__supportsealWidget = true;

  var script =
    document.currentScript ||
    (function () {
      var all = document.querySelectorAll('script[data-key]');
      for (var i = all.length - 1; i >= 0; i--) {
        if (all[i].src && all[i].src.indexOf('/widget.js') !== -1) return all[i];
      }
      return null;
    })();
  if (!script) return;

  var key = script.getAttribute('data-key');
  var previewMode = script.getAttribute('data-preview') === '1';
  var serviceOrigin = (function () {
    try {
      return new URL(script.src).origin;
    } catch (e) {
      return '';
    }
  })();
  if (!key || !serviceOrigin) return;

  var hostEl = null;
  var launcher = null;
  var frame = null;
  var open = false;
  var unread = 0;
  var retries = [2000, 10000, 30000];
  var retryIndex = 0;
  var config = null;

  function autoContrast(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return '#fff';
    var c = m[1];
    var r = parseInt(c.slice(0, 2), 16) / 255;
    var g = parseInt(c.slice(2, 4), 16) / 255;
    var b = parseInt(c.slice(4, 6), 16) / 255;
    function lin(x) { return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }
    var l = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    return l > 0.35 ? '#000' : '#fff';
  }

  function isMobile() { return window.innerWidth < 640; }

  var testTokenAttr = script.getAttribute('data-test-token') || '';
  function loadConfig() {
    if (previewMode) {
      config = {
        name: script.getAttribute('data-name') || 'Support',
        color: script.getAttribute('data-color') || '#2563eb',
        availability: script.getAttribute('data-availability') === 'AWAY' ? 'AWAY' : 'LIVE'
      };
      render();
      return;
    }
    var url = serviceOrigin + '/api/widget/config?key=' + encodeURIComponent(key) +
      '&host=' + encodeURIComponent(window.location.origin) +
      (testTokenAttr ? '&testToken=' + encodeURIComponent(testTokenAttr) : '');
    fetch(url)
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (data) {
        config = data;
        retryIndex = 0;
        render();
      })
      .catch(function () {
        if (retryIndex < retries.length) {
          setTimeout(loadConfig, retries[retryIndex++]);
        }
      });
  }

  function render() {
    if (!config || hostEl) return;
    hostEl = document.createElement('div');
    hostEl.id = 'supportseal-widget-host';
    hostEl.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;z-index:2147483000;';
    var root = hostEl.attachShadow({ mode: 'open' });
    var style = document.createElement('style');
    style.textContent = [
      '.launcher{position:fixed;bottom:20px;right:20px;width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;box-shadow:0 4px 24px rgba(21,38,31,.24);display:flex;align-items:center;justify-content:center;transition:transform .16s ease;}',
      '@media (max-width:639px){.launcher{bottom:16px;right:16px;}}',
      '.launcher:hover{transform:scale(1.05)}',
      '.launcher svg{width:26px;height:26px}',
      '.badge{position:absolute;top:-4px;right:-4px;min-width:20px;height:20px;padding:0 5px;border-radius:10px;background:#C42B2B;color:#fff;font:600 12px/20px system-ui,sans-serif;text-align:center;display:none}',
      '.panel{position:fixed;border:none;background:transparent;width:0;height:0}',
    ].join('');
    root.appendChild(style);

    launcher = document.createElement('button');
    launcher.className = 'launcher';
    launcher.setAttribute('aria-label', 'Open chat with ' + config.name);
    launcher.style.background = config.color;
    var ink = autoContrast(config.color);
    launcher.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="' + ink + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>' +
      '<span class="badge"></span>';
    launcher.addEventListener('click', toggle);
    root.appendChild(launcher);

    frame = document.createElement('iframe');
    frame.className = 'panel';
    frame.title = config.name + ' support chat';
    frame.src = serviceOrigin + '/widget?key=' + encodeURIComponent(key) +
      '&host=' + encodeURIComponent(window.location.origin) +
      (testTokenAttr ? '&testToken=' + encodeURIComponent(testTokenAttr) : '') +
      (previewMode
        ? '&preview=1&name=' + encodeURIComponent(config.name) +
          '&color=' + encodeURIComponent(config.color) +
          '&availability=' + encodeURIComponent(config.availability)
        : '');
    frame.setAttribute('allow', 'clipboard-write');
    frame.addEventListener('load', function () {
      panelReady = true;
      notifyPage();
      flushApi();
    });
    root.appendChild(frame);

    document.body.appendChild(hostEl);
    observeRemoval();
    if (previewMode) {
      // Previews start with the panel open (onboarding.md "launcher and open
      // panel"); the visitor can still close it.
      setTimeout(function () { if (!open) toggle(); }, 400);
    }
  }

  function positionPanel() {
    if (!frame) return;
    if (open) {
      if (isMobile()) {
        frame.style.cssText = 'position:fixed;inset:0;width:100%;height:100dvh;border:none;background:transparent;z-index:2147483001';
      } else {
        var h = Math.min(640, window.innerHeight - 120);
        frame.style.cssText = 'position:fixed;bottom:96px;right:20px;width:380px;height:' + h + 'px;border:none;border-radius:12px;box-shadow:0 8px 32px rgba(21,38,31,.24);z-index:2147483001;background:#fff';
      }
      frame.style.display = 'block';
    } else {
      frame.style.display = 'none';
    }
  }

  function toggle() {
    open = !open;
    if (open) setUnread(0);
    positionPanel();
    if (launcher) launcher.setAttribute('aria-label', (open ? 'Close chat with ' : 'Open chat with ') + (config ? config.name : ''));
    if (frame && frame.contentWindow) {
      frame.contentWindow.postMessage({ type: open ? 'ss:open' : 'ss:close' }, serviceOrigin);
    }
  }

  function setUnread(n) {
    unread = n;
    if (!launcher) return;
    var badge = launcher.querySelector('.badge');
    if (!badge) return;
    badge.style.display = n > 0 ? 'block' : 'none';
    badge.textContent = n > 9 ? '9+' : String(n);
  }

  window.addEventListener('message', function (event) {
    if (event.origin !== serviceOrigin || !event.data) return;
    if (event.data.type === 'ss:unread' && !open) setUnread(event.data.count || 1);
    if (event.data.type === 'ss:close' && open) toggle();
    if (event.data.type === 'ss:navigate' && frame && frame.contentWindow) {
      frame.contentWindow.postMessage({ type: 'ss:page', path: event.data.path }, serviceOrigin);
    }
  });

  window.addEventListener('resize', positionPanel);

  // SPA survival: keep the host mounted and report client-side navigation.
  var pushState = history.pushState;
  history.pushState = function () {
    var result = pushState.apply(this, arguments);
    notifyPage();
    return result;
  };
  window.addEventListener('popstate', notifyPage);
  function notifyPage() {
    if (frame && frame.contentWindow) {
      frame.contentWindow.postMessage({ type: 'ss:page', path: window.location.pathname }, serviceOrigin);
    }
  }

  function observeRemoval() {
    if (!('MutationObserver' in window) || !hostEl) return;
    var observer = new MutationObserver(function () {
      if (hostEl && !document.body.contains(hostEl)) {
        document.body.appendChild(hostEl);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // --- Developer context API (FR-CTX-01): window.SupportSeal -------------
  // identify()/context() are queued until the panel exists, then forwarded.
  var apiQueue = [];
  var panelReady = false;
  function enqueue(type, payload) {
    apiQueue.push({ type: type, payload: payload });
    flushApi();
  }
  function flushApi() {
    // Only post once the panel document has loaded: earlier postMessages hit
    // about:blank (origin "null") and are silently dropped.
    if (!panelReady || !frame || !frame.contentWindow) return;
    while (apiQueue.length) {
      var item = apiQueue.shift();
      frame.contentWindow.postMessage({ type: 'ss:' + item.type, payload: item.payload }, serviceOrigin);
    }
  }
  function dispatch(entry) {
    try {
      var type = entry && entry[0];
      if (type === 'identify' || type === 'context') enqueue(type, entry[1] || {});
    } catch (e) { /* untrusted queue entries never break the widget */ }
  }
  var publicApi = {
    identify: function (payload) { enqueue('identify', payload || {}); },
    context: function (payload) { enqueue('context', payload || {}); },
    // Keep the documented async-safety queue usable after the loader takes
    // over window.SupportSealWidget: q.push(['identify', {...}]) keeps working.
    q: {
      push: function (entry) { dispatch(entry); },
    },
  };
  var existing = window.SupportSealWidget || {};
  var pending = (existing && Array.isArray(existing.q)) ? existing.q : [];
  window.SupportSealWidget = publicApi;
  for (var i = 0; i < pending.length; i++) {
    dispatch(pending[i]);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadConfig);
  } else {
    loadConfig();
  }
})();
`;
