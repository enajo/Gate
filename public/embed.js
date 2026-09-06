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
      ".gate-embed-close:hover{background:rgba(0,0,0,.12);}";
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

  function closeOverlay() {
    var overlay = document.getElementById(OVERLAY_ID);
    if (!overlay) return;
    overlay.classList.remove("gate-embed-open");
    document.body.style.overflow = "";
    window.setTimeout(function () {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 180);
    document.removeEventListener("keydown", onKeydown);
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
    if (!data || data.source !== "gate-embed" || data.type !== "gate:height") return;
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

    panel.appendChild(close);
    panel.appendChild(iframe);
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
