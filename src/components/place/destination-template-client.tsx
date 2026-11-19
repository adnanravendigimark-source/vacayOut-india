"use client";

import { useEffect } from "react";

/**
 * Opens a closed <details> ("See all places") when a link targets a card inside it,
 * then scrolls the card into view. Works for links on the page and for arriving with a #hash.
 */
export function HashOpener() {
  useEffect(() => {
    const open = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!id) return;
      const el = document.getElementById(id);
      if (!el) return;
      const box = el.closest("details");
      if (box && !box.open) {
        box.open = true;
        requestAnimationFrame(() => el.scrollIntoView({ block: "start" }));
      }
    };
    open();
    window.addEventListener("hashchange", open);
    return () => window.removeEventListener("hashchange", open);
  }, []);
  return null;
}
