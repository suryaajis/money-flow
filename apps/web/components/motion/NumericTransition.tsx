"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { v14EnhancementsEnabled } from "@/lib/featureFlags";

interface NumericTransitionProps {
  value: number;
  format: (value: number) => string;
  duration?: number;
}

export function NumericTransition({
  value,
  format,
  duration = 420,
}: NumericTransitionProps) {
  const reducedMotion = useReducedMotion();
  const previous = useRef(value);
  const [displayed, setDisplayed] = useState(value);

  useEffect(() => {
    if (!v14EnhancementsEnabled || reducedMotion || previous.current === value) {
      previous.current = value;
      setDisplayed(value);
      return;
    }
    const from = previous.current;
    const startedAt = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(from + (value - from) * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
      else previous.current = value;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [duration, reducedMotion, value]);

  return <span aria-live="polite">{format(displayed)}</span>;
}
