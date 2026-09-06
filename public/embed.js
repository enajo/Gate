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
 * Optional attributes on the <script> tag:
 *   data-gate-text     Button label (default "Book a call")
 *   data-gate-color    Accent hex color (default brand amber)
 *   data-gate-position "bottom-right" (default) or "bottom-left"
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
      "@keyframes gate-embed-spin{to{transform:rotate(360deg);}}";
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

  var READY_TIMEOUT_MS = 4000;
  var readyTimeoutId = null;

  function closeOverlay() {
    var overlay = document.getElementById(OVERLAY_ID);
    if (!overlay) return;
    overlay.classList.remove("gate-embed-open");
    document.body.style.overflow = "";
    window.setTimeout(function () {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 180);
    document.removeEventListener("keydown", onKeydown);
    if (readyTimeoutId) {
      window.clearTimeout(readyTimeoutId);
      readyTimeoutId = null;
    }
  }

  // Hides the loading spinner and reveals the iframe. Called either when
  // the embedded page announces it's hydrated and interactive
  // (gate:ready), or after READY_TIMEOUT_MS regardless — a slug that 404s
  // never mounts EmbedHeightReporter and so never sends gate:ready, and a
  // stuck spinner would be worse than showing whatever did load.
  function revealPanel() {
    if (readyTimeoutId) {
      window.clearTimeout(readyTimeoutId);
      readyTimeoutId = null;
    }
    var overlay = document.getElementById(OVERLAY_ID);
    if (!overlay) return;
    var spinner = overlay.querySelector(".gate-embed-spinner");
    if (spinner) spinner.classList.add("gate-embed-spinner-hide");
  }

  function onKeydown(e) {
    if (e.key === "Escape") closeOverlay();
  }

  var MIN_PANEL_HEIGHT_PX = 320;

  // The iframe's own page (EmbedHeightReporter) posts its real content
  // height so the panel can size to the actual conversation/booking flow
  // instead of guessing a fixed height — still capped to fit the viewport
  // since this renders as an overlay, never taller than 90vh.
  function onMessage(e) {
    if (e.origin !== origin) return;
    var data = e.data;
    if (!data || data.source !== "gate-embed") return;

    if (data.type === "gate:ready") {
      revealPanel();
      return;
    }

    if (data.type !== "gate:height") return;
    if (typeof data.height !== "number" || !isFinite(data.height)) return;

    var overlay = document.getElementById(OVERLAY_ID);
    if (!overlay) return;
    var panel = overlay.querySelector(".gate-embed-panel");
    if (!panel) return;

    var maxHeight = window.innerHeight * 0.9;
    var height = Math.min(Math.max(data.height, MIN_PANEL_HEIGHT_PX), maxHeight);
    panel.style.height = height + "px";
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

    var iframe = document.createElement("iframe");
    iframe.src = buildIframeSrc(targetSlug);
    iframe.title = "Book a time";

    var spinner = document.createElement("div");
    spinner.className = "gate-embed-spinner";
    var spinnerCircle = document.createElement("div");
    spinnerCircle.className = "gate-embed-spinner-circle";
    spinnerCircle.style.color = accentColor;
    spinner.appendChild(spinnerCircle);

    panel.appendChild(close);
    panel.appendChild(iframe);
    panel.appendChild(spinner);
    overlay.appendChild(panel);

    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeOverlay();
    });

    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeydown);
    readyTimeoutId = window.setTimeout(revealPanel, READY_TIMEOUT_MS);

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

  function init() {
    wireManualTriggers();
    if (mode !== "manual") injectFloatingButton();
    window.addEventListener("message", onMessage);
  }

  // Global API — lets a professional open the widget from their own JS too.
  window.Gate = window.Gate || {};
  window.Gate.open = openOverlay;
  window.Gate.close = closeOverlay;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
