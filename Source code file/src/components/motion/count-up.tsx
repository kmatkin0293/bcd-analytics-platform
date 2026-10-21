"use client";

import { useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/**
 * Animates a number from 0 up to `value` once it scrolls into view.
 * Renders `prefix`/`suffix` around the number and preserves decimal
 * precision inferred from `value` (e.g. 98.6 counts up with one decimal).
 */
export function CountUp({
  value,
  duration = 1.4,
  prefix = "",
  suffix = "",
  className,
  decimals: decimalsProp,
}: {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  /** Force a fixed decimal count (e.g. 2 for a "00.00" look) instead of inferring it from `value`'s own string representation. */
  decimals?: number;
}) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLSpanElement | null>(null);
  const [display, setDisplay] = useState(reduceMotion ? value : 0);
  const [started, setStarted] = useState(false);

  const decimals =
    decimalsProp ??
    (() => {
      const str = value.toString();
      const dot = str.indexOf(".");
      return dot === -1 ? 0 : str.length - dot - 1;
    })();

  useEffect(() => {
    if (reduceMotion || started) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [reduceMotion, started]);

  useEffect(() => {
    if (reduceMotion || !started) return;
    const start = performance.now();
    const durationMs = duration * 1000;
    let frame: number;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / durationMs);
      // easeOutCubic
      const eased = 1 - (1 - progress) ** 3;
      setDisplay(value * eased);
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        setDisplay(value);
      }
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [started, value, duration, reduceMotion]);

  const formatted =
    decimals === 0
      ? Math.round(display).toLocaleString("en-US")
      : display.toFixed(decimals);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
