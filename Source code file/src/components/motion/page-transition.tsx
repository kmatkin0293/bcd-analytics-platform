"use client";

import { AnimatePresence, motion, type Variants, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";

const variants: Variants = {
  initial: { opacity: 0, y: 10 },
  // Enter is a touch slower and settles with a slight upward drift, so
  // navigation reads as deliberate rather than jumpy.
  animate: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] } },
  // Exit is quick — the old page shouldn't linger on the way out.
  exit: { opacity: 0, y: -6, transition: { duration: 0.14, ease: "easeIn" } },
};

/** Route-keyed fade/slide wrapper, mounted once around the whole app. */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  if (reduceMotion) return <>{children}</>;

  // No `initial={false}` here: suppressing the entry animation on the very
  // first AnimatePresence mount makes the client's first render compute the
  // "animate" variant while SSR always computes "initial" for that same
  // node, which is an inline-style hydration mismatch. Letting the first
  // page load animate in (same as the rest of the app already does) keeps
  // server and client markup identical during hydration.
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
