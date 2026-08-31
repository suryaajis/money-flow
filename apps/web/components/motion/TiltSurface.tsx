"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TiltSurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  maxTilt?: number;
}

/**
 * A deliberately restrained pointer tilt for one or two hero surfaces.
 * Touch devices and reduced-motion users get the exact same content without
 * any transform or pointer tracking.
 */
export const TiltSurface = React.forwardRef<HTMLDivElement, TiltSurfaceProps>(
  (
    { className, maxTilt = 2.5, onPointerMove, onPointerLeave, ...props },
    forwardedRef,
  ) => {
    const localRef = React.useRef<HTMLDivElement | null>(null);

    const setRef = React.useCallback(
      (node: HTMLDivElement | null) => {
        localRef.current = node;
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      },
      [forwardedRef],
    );

    const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
      onPointerMove?.(event);
      if (
        event.pointerType !== "mouse" ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        return;
      }

      const node = localRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      node.style.transform = `perspective(900px) rotateX(${-y * maxTilt}deg) rotateY(${x * maxTilt}deg) translateY(-2px)`;
      node.style.setProperty("--pointer-x", `${(x + 0.5) * 100}%`);
      node.style.setProperty("--pointer-y", `${(y + 0.5) * 100}%`);
    };

    const handlePointerLeave = (event: React.PointerEvent<HTMLDivElement>) => {
      onPointerLeave?.(event);
      if (localRef.current) localRef.current.style.transform = "";
    };

    return (
      <div
        ref={setRef}
        className={cn(
          "transition-transform duration-300 ease-out will-change-transform",
          className,
        )}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        {...props}
      />
    );
  },
);

TiltSurface.displayName = "TiltSurface";
