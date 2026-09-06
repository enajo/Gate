"use client";

import { useEffect } from "react";

const MESSAGE_SOURCE = "gate-embed";
// Below this, a resize is almost certainly sub-pixel layout jitter, not a
// real content change — skip posting to avoid spamming the parent window.
const MIN_HEIGHT_DELTA_PX = 4;

/**
 * Reports this page's real content height to whatever window embedded it
 * in an iframe (public/embed.js), so the popup panel there can size itself
 * to the actual conversation/booking flow instead of guessing a fixed
 * height. Renders nothing — a no-op on /[slug] or any page that isn't
 * actually inside an iframe (window.parent === window).
 */
export function EmbedHeightReporter() {
  useEffect(() => {
    if (window.parent === window) return;

    let lastPosted = 0;

    function postHeight() {
      const height = Math.ceil(document.documentElement.scrollHeight);
      if (Math.abs(height - lastPosted) < MIN_HEIGHT_DELTA_PX) return;
      lastPosted = height;
      window.parent.postMessage(
        { source: MESSAGE_SOURCE, type: "gate:height", height },
        "*",
      );
    }

    postHeight();

    const observer = new ResizeObserver(() => postHeight());
    observer.observe(document.documentElement);

    return () => observer.disconnect();
  }, []);

  return null;
}
