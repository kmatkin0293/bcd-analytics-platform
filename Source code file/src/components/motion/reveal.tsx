"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  delay?: number;
  y?: number;
  duration?: number;
  className?: string;
  once?: boolean;
};

/**
 * Scroll/mount fade-up reveal. Renders children in their final, fully
 * visible state immediately when `prefers-reduced-motion: reduce` is set —
 * never animates opacity/position in that case.
 */
export function Reveal({
  children,
  delay = 0,
  y = 18,
  duration = 0.6,
  className,
  once = true,
}: RevealProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "-80px" }}
      transition={{ duration, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

type StaggerProps = {
  children: ReactNode;
  className?: string;
  stagger?: number;
  once?: boolean;
};

/** Wraps a list of direct children, staggering each one's fade-up reveal. */
export function StaggerGroup({
  children,
  className,
  stagger = 0.08,
  once = true,
}: StaggerProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: "-80px" }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
  y = 16,
}: {
  children: ReactNode;
  className?: string;
  y?: number;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Subtle, continuous presence indicator — a breathing dot. `color` must be a
 * literal CSS color (hex), not a Chakra token name, since it's applied via
 * an inline style for the Framer Motion keyframe animation.
 */
export function PulseDot({ color = "#4B2882" }: { color?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      style={{
        width: 6,
        height: 6,
        borderRadius: "50%",
        backgroundColor: color,
        flexShrink: 0,
      }}
      animate={
        reduceMotion
          ? undefined
          : { opacity: [1, 0.4, 1], scale: [1, 0.85, 1] }
      }
      transition={{ duration: 1.8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
    />
  );
}
