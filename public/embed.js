/**
 * Gate embeddable booking widget.
 *
 * Usage — floating button (default):
 *   <script async src="https://<your-gate-domain>/embed.js" data-gate-slug="sarah-malik"></script>
 *
 * Usage — trigger from your own button/link:
 *   <script async src="https://<your-gate-domain>/embed.js" data-gate-slug="sarah-malik" data-gate-mode="manual"></script>
 *   <button data-gate-open="sarah-malik">Book time with me</button>
 *
 * Usage — inline (embedded directly in the page, no popup):
 *   <script async src="https://<your-gate-domain>/embed.js" data-gate-slug="sarah-malik" data-gate-mode="inline"></script>
 *   <div data-gate-inline></div>
 *
 *   Give a div its own data-gate-inline="other-slug" to embed a different
 *   professional than the script tag's default — useful for embedding more
 *   than one gate on the same page.
 *
 * Optional attributes on the <script> tag:
 *   data-gate-text     Button label (default "Book a call") — popup modes only
 *   data-gate-color    Accent hex color (default brand amber)
 *   data-gate-position "bottom-right" (default) or "bottom-left" — popup modes only
 */
(function () {
  "use strict";

  var thisScript = document.currentScript;
  if (!thisScript) return;

  var slug = thisScript.getAttribute("data-gate-slug");
  if (!slug) {
    console.error("[Gate embed] missing required data-gate-slug attribute.");
    return;
  }

  var origin = new URL(thisScript.src).origin;
  var mode = thisScript.getAttribute("data-gate-mode") || "button";
  var buttonText = thisScript.getAttribute("data-gate-text") || "Book a call";
  var accentColor = thisScript.getAttribute("data-gate-color") || "#dfa767";
  var position = thisScript.getAttribute("data-gate-position") || "bottom-right";

  var STYLE_ID = "gate-embed-style";
  var OVERLAY_ID = "gate-embed-overlay";
  var INLINE_ATTR = "data-gate-inline";
  var READY_TIMEOUT_MS = 4000;
  var MIN_FRAME_HEIGHT_PX = 320;
  var DEFAULT_INLINE_HEIGHT_PX = 640;

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent =
      ".gate-embed-trigger{position:fixed;z-index:2147483000;display:inline-flex;" +
      "align-items:center;gap:8px;height:48px;padding:0 20px;border-radius:9999px;" +
      "border:none;cursor:pointer;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI'," +
      "Roboto,Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;color:#1a1a1a;" +
      "box-shadow:0 6px 20px rgba(0,0,0,.18);transition:transform .15s ease,box-shadow .15s ease;}" +
      ".gate-embed-trigger:hover{transform:translateY(-1px);box-shadow:0 10px 26px rgba(0,0,0,.22);}" +
      ".gate-embed-trigger.gate-embed-br{right:24px;bottom:24px;}" +
      ".gate-embed-trigger.gate-embed-bl{left:24px;bottom:24px;}" +
      ".gate-embed-overlay{position:fixed;inset:0;z-index:2147483001;display:flex;" +
      "align-items:center;justify-content:center;background:rgba(20,18,14,.55);" +
      "padding:24px;opacity:0;transition:opacity .18s ease;}" +
      ".gate-embed-overlay.gate-embed-open{opacity:1;}" +
      ".gate-embed-panel{position:relative;width:100%;max-width:480px;height:min(760px,90vh);" +
      "background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.35);" +
      "transform:translateY(12px) scale(.98);transition:transform .18s ease,height .2s ease;}" +
      ".gate-embed-overlay.gate-embed-open .gate-embed-panel{transform:translateY(0) scale(1);}" +
      ".gate-embed-panel iframe{width:100%;height:100%;border:0;display:block;}" +
      ".gate-embed-close{position:absolute;top:12px;right:12px;z-index:1;width:32px;height:32px;" +
      "border-radius:9999px;border:none;background:rgba(0,0,0,.06);cursor:pointer;" +
      "font-size:16px;line-height:1;color:#1a1a1a;}" +
      ".gate-embed-close:hover{background:rgba(0,0,0,.12);}" +
      ".gate-embed-spinner{position:absolute;inset:0;display:flex;align-items:center;" +
      "justify-content:center;background:#fff;transition:opacity .2s ease;}" +
      ".gate-embed-spinner.gate-embed-spinner-hide{opacity:0;pointer-events:none;}" +
      ".gate-embed-spinner-circle{width:28px;height:28px;border-radius:50%;" +
      "border:3px solid rgba(0,0,0,.1);border-top-color:currentColor;" +
      "animation:gate-embed-spin .7s linear infinite;}" +
      "@keyframes gate-embed-spin{to{transform:rotate(360deg);}}" +
      ".gate-embed-inline{position:relative;width:100%;border-radius:24px;overflow:hidden;}" +
      ".gate-embed-inline iframe{width:100%;border:0;display:block;transition:height .2s ease;}";
    document.head.appendChild(style);
  }

  function buildIframeSrc(targetSlug) {
    var params = new URLSearchParams();
    var pageUtm = new URLSearchParams(window.location.search);
    ["utm_source", "utm_medium", "utm_campaign"].forEach(function (key) {
      var value = pageUtm.get(key);
      if (value) params.set(key, value);
    });
    var query = params.toString();
    return origin + "/embed/" + encodeURIComponent(targetSlug) + (query ? "?" + query : "");
  }

  // ── Shared frame lifecycle (used by both the popup panel and inline embeds) ──

  // Builds the loading spinner + iframe pair and appends them to `container`
  // (a .gate-embed-panel for popup mode, or a [data-gate-inline] div for
  // inline mode). `initialHeightPx`, when given, sets the iframe's own
  // starting height directly — inline embeds have no ambient container
  // height to fall back on the way the popup panel's CSS does.
  function attachLoadingFrame(container, targetSlug, initialHeightPx) {
    var iframe = document.createElement("iframe");
    iframe.src = buildIframeSrc(targetSlug);
    iframe.title = "Book a time";
    if (initialHeightPx) iframe.style.height = initialHeightPx + "px";

    var spinner = document.createElement("div");
    spinner.className = "gate-embed-spinner";
    var spinnerCircle = document.createElement("div");
    spinnerCircle.className = "gate-embed-spinner-circle";
    spinnerCircle.style.color = accentColor;
    spinner.appendChild(spinnerCircle);

    container.appendChild(iframe);
    container.appendChild(spinner);

    iframe._gateSpinner = spinner;
    iframe._gateReadyTimeoutId = window.setTimeout(function () {
      revealFrame(iframe);
    }, READY_TIMEOUT_MS);

    return iframe;
  }

  // Hides a frame's loading spinner. Called either when its page announces
  // it's hydrated and interactive (gate:ready), or after READY_TIMEOUT_MS
  // regardless — a slug that 404s never sends gate:ready, and a stuck
  // spinner would be a worse failure mode than showing whatever did load.
  function revealFrame(iframe) {
    if (iframe._gateReadyTimeoutId) {
      window.clearTimeout(iframe._gateReadyTimeoutId);
      iframe._gateReadyTimeoutId = null;
    }
    if (iframe._gateSpinner) iframe._gateSpinner.classList.add("gate-embed-spinner-hide");
  }

  function findIframeBySource(sourceWindow) {
    var frames = document.querySelectorAll(".gate-embed-panel iframe, .gate-embed-inline iframe");
    for (var i = 0; i < frames.length; i++) {
      if (frames[i].contentWindow === sourceWindow) return frames[i];
    }
    return null;
  }

  // Routes a message to whichever iframe actually sent it (there can be
  // several at once across inline embeds, though only one popup panel).
  // The popup panel is capped to the viewport since it renders as an
  // overlay; an inline embed just grows/shrinks in the page's own flow.
  function onMessage(e) {
    if (e.origin !== origin) return;
    var data = e.data;
    if (!data || data.source !== "gate-embed") return;

    var iframe = findIframeBySource(e.source);
    if (!iframe) return;

    if (data.type === "gate:ready") {
      revealFrame(iframe);
      return;
    }

    if (data.type !== "gate:height") return;
    if (typeof data.height !== "number" || !isFinite(data.height)) return;

    var panel = iframe.closest(".gate-embed-panel");
    if (panel) {
      var maxHeight = window.innerHeight * 0.9;
      var height = Math.min(Math.max(data.height, MIN_FRAME_HEIGHT_PX), maxHeight);
      panel.style.height = height + "px";
    } else {
      iframe.style.height = Math.max(data.height, MIN_FRAME_HEIGHT_PX) + "px";
    }
  }

  // ── Popup (button / manual) mode ──────────────────────────────────────────

  function closeOverlay() {
    var overlay = document.getElementById(OVERLAY_ID);
    if (!overlay) return;
    overlay.classList.remove("gate-embed-open");
    document.body.style.overflow = "";
    window.setTimeout(function () {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 180);
    document.removeEventListener("keydown", onKeydown);
    var iframe = overlay.querySelector("iframe");
    if (iframe) revealFrame(iframe); // clears any pending ready-timeout
  }

  function onKeydown(e) {
    if (e.key === "Escape") closeOverlay();
  }

  function openOverlay(targetSlug) {
    injectStyles();
    if (document.getElementById(OVERLAY_ID)) return; // already open

    var overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.className = "gate-embed-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");

    var panel = document.createElement("div");
    panel.className = "gate-embed-panel";

    var close = document.createElement("button");
    close.className = "gate-embed-close";
    close.type = "button";
    close.setAttribute("aria-label", "Close booking widget");
    close.textContent = "×";
    close.addEventListener("click", closeOverlay);
    panel.appendChild(close);

    attachLoadingFrame(panel, targetSlug);

    overlay.appendChild(panel);

    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeOverlay();
    });

    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeydown);

    // Next frame, so the opacity/transform transition actually plays.
    window.requestAnimationFrame(function () {
      overlay.classList.add("gate-embed-open");
    });
  }

  function wireManualTriggers() {
    var triggers = document.querySelectorAll("[data-gate-open]");
    for (var i = 0; i < triggers.length; i++) {
      (function (el) {
        el.addEventListener("click", function (e) {
          e.preventDefault();
          openOverlay(el.getAttribute("data-gate-open") || slug);
        });
      })(triggers[i]);
    }
  }

  function injectFloatingButton() {
    injectStyles();
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "gate-embed-trigger " + (position === "bottom-left" ? "gate-embed-bl" : "gate-embed-br");
    btn.style.background = accentColor;
    btn.textContent = buttonText;
    btn.addEventListener("click", function () {
      openOverlay(slug);
    });
    document.body.appendChild(btn);
  }

  // ── Inline mode ───────────────────────────────────────────────────────────

  // Fills every not-yet-initialized [data-gate-inline] container on the
  // page with an embedded gate. Exposed as window.Gate.renderInline so a
  // professional whose site adds containers dynamically (a SPA route
  // change, a CMS block loaded after page load) can call it again.
  function renderInlineEmbeds() {
    injectStyles();
    var containers = document.querySelectorAll("[" + INLINE_ATTR + "]");
    for (var i = 0; i < containers.length; i++) {
      var container = containers[i];
      if (container.hasAttribute("data-gate-inline-ready")) continue;
      container.setAttribute("data-gate-inline-ready", "true");
      container.classList.add("gate-embed-inline");

      var targetSlug = container.getAttribute(INLINE_ATTR) || slug;
      attachLoadingFrame(container, targetSlug, DEFAULT_INLINE_HEIGHT_PX);
    }
  }

  function init() {
    if (mode === "inline") {
      renderInlineEmbeds();
    } else {
      wireManualTriggers();
      if (mode !== "manual") injectFloatingButton();
    }
    window.addEventListener("message", onMessage);
  }

  // Global API — lets a professional open the widget from their own JS too.
  window.Gate = window.Gate || {};
  window.Gate.open = openOverlay;
  window.Gate.close = closeOverlay;
  window.Gate.renderInline = renderInlineEmbeds;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
