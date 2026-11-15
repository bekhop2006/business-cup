"use client";

import { useEffect } from "react";

// The care page streams in after the browser has looked for #book or
// #providers, so scroll to the anchor once the content is there.
export function ScrollToHash() {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (id) document.getElementById(id)?.scrollIntoView();
  }, []);
  return null;
}
