"use client";

import NextImage from "next/image";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Vera's visual identity — the Grant Thornton pinwheel mark, given a slow
 * continuous spin to read as "alive" without being distracting. Falls back
 * to a static mark under `prefers-reduced-motion: reduce`.
 */
export function VeraMark({
  size = 20,
  spinning = true,
}: {
  size?: number;
  /** Set false to freeze the mark (e.g. while idle, not actively thinking). */
  spinning?: boolean;
}) {
  const reduceMotion = useReducedMotion();

  const image = (
    <NextImage
      src="/brand/grant-thornton-mark.png"
      alt="Vera"
      width={size}
      height={size}
      style={{ width: size, height: size, objectFit: "contain", flexShrink: 0 }}
    />
  );

  if (reduceMotion) return image;

  return (
    <motion.div
      style={{ width: size, height: size, flexShrink: 0 }}
      animate={spinning ? { rotate: 360 } : { rotate: 0 }}
      transition={
        spinning
          ? { duration: 6, repeat: Number.POSITIVE_INFINITY, ease: "linear" }
          : { duration: 0.3 }
      }
    >
      {image}
    </motion.div>
  );
}
