"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Renders children directly into `document.body`, bypassing whatever's in
 * between in the React tree.
 *
 * Needed for every `position: fixed` overlay in this app (modals, dialogs):
 * `PageTransition` wraps all page content in a `motion.div` that animates
 * `y`, which leaves an inline `transform` style on it even at rest. Per the
 * CSS spec, any ancestor with a `transform` other than `none` becomes the
 * containing block for `position: fixed` descendants — so without a
 * portal, every "fixed" overlay nested under that wrapper was silently
 * confined to its box instead of the real viewport (wrong size/position,
 * clipped, or just not covering the screen).
 */
export function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  return createPortal(children, document.body);
}
