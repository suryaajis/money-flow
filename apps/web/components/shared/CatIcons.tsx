import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Inline cat-themed SVG illustrations — kept light-weight so they don't
 * bloat the bundle. All icons inherit `currentColor` so they tint with
 * Tailwind text utilities.
 */

interface CatIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

/** Happy cat face — used to indicate income / positive state. */
export const HappyCatIcon: React.FC<CatIconProps> = ({ className, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("h-5 w-5", className)}
    aria-hidden
    {...props}
  >
    {/* ears */}
    <path d="M5 8 L4 3 L9 6" fill="currentColor" stroke="none" />
    <path d="M19 8 L20 3 L15 6" fill="currentColor" stroke="none" />
    {/* face */}
    <ellipse cx="12" cy="13" rx="8" ry="7" fill="currentColor" opacity="0.15" />
    <ellipse cx="12" cy="13" rx="8" ry="7" />
    {/* eyes — happy closed arcs */}
    <path d="M8.5 12 q1 1.2 2 0" />
    <path d="M13.5 12 q1 1.2 2 0" />
    {/* nose + smile */}
    <path d="M11.4 14.6 q0.6 0.5 1.2 0" />
    <path d="M10.5 15.4 q1.5 1.4 3 0" />
    {/* whiskers */}
    <path d="M3.5 13.5 L7 13.8" opacity="0.6" />
    <path d="M17 13.8 L20.5 13.5" opacity="0.6" />
  </svg>
);

/** Sad cat face — used to indicate expense / negative state. */
export const SadCatIcon: React.FC<CatIconProps> = ({ className, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("h-5 w-5", className)}
    aria-hidden
    {...props}
  >
    <path d="M5 8 L4 3 L9 6" fill="currentColor" stroke="none" />
    <path d="M19 8 L20 3 L15 6" fill="currentColor" stroke="none" />
    <ellipse cx="12" cy="13" rx="8" ry="7" fill="currentColor" opacity="0.15" />
    <ellipse cx="12" cy="13" rx="8" ry="7" />
    {/* sad eyes — small drops */}
    <circle cx="9.5" cy="12.2" r="0.9" fill="currentColor" stroke="none" />
    <circle cx="14.5" cy="12.2" r="0.9" fill="currentColor" stroke="none" />
    <path d="M9.5 13.6 q-0.2 1.5 0.4 2.4" opacity="0.5" />
    {/* nose + frown */}
    <path d="M11.4 14.6 q0.6 0.5 1.2 0" />
    <path d="M10.5 16 q1.5 -1.2 3 0" />
    <path d="M3.5 13.5 L7 13.8" opacity="0.6" />
    <path d="M17 13.8 L20.5 13.5" opacity="0.6" />
  </svg>
);

/** Cat paw — used as accent / FAB. */
export const PawIcon: React.FC<CatIconProps> = ({ className, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={cn("h-5 w-5", className)}
    aria-hidden
    {...props}
  >
    <ellipse cx="6.5" cy="9.5" rx="1.8" ry="2.4" />
    <ellipse cx="17.5" cy="9.5" rx="1.8" ry="2.4" />
    <ellipse cx="9" cy="5.5" rx="1.6" ry="2.2" />
    <ellipse cx="15" cy="5.5" rx="1.6" ry="2.2" />
    <path d="M12 11.5 c-3.5 0 -5.5 2.6 -5.5 5.4 c0 2 1.6 3.4 3.6 3.4 c0.9 0 1.4 -0.4 1.9 -0.4 c0.5 0 1 0.4 1.9 0.4 c2 0 3.6 -1.4 3.6 -3.4 c0 -2.8 -2 -5.4 -5.5 -5.4 z" />
  </svg>
);

/** Sleeping cat — used in empty states. */
export const SleepingCat: React.FC<CatIconProps> = ({ className, ...props }) => (
  <svg
    viewBox="0 0 120 80"
    fill="none"
    className={cn("h-24 w-auto", className)}
    aria-hidden
    {...props}
  >
    {/* shadow */}
    <ellipse cx="60" cy="72" rx="40" ry="3" fill="currentColor" opacity="0.08" />
    {/* body — curled up cat */}
    <path
      d="M22 60 q-2 -22 22 -28 q12 -3 24 0 q22 4 28 16 q4 12 -4 18 q-6 4 -16 4 z"
      fill="currentColor"
      opacity="0.85"
    />
    {/* head */}
    <circle cx="34" cy="42" r="14" fill="currentColor" />
    {/* ears */}
    <path d="M24 32 L22 22 L31 28 z" fill="currentColor" />
    <path d="M44 30 L48 22 L40 28 z" fill="currentColor" />
    {/* sleeping eye (closed) */}
    <path
      d="M28 44 q3 1.5 6 0"
      stroke="var(--background)"
      strokeWidth="1.6"
      strokeLinecap="round"
      fill="none"
    />
    {/* nose */}
    <circle cx="22" cy="46" r="1.4" fill="var(--background)" />
    {/* whiskers */}
    <path d="M14 45 L20 46" stroke="var(--background)" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
    <path d="M14 49 L20 48" stroke="var(--background)" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
    {/* tail curl */}
    <path
      d="M88 56 q14 0 14 -10 q0 -8 -10 -8"
      stroke="currentColor"
      strokeWidth="6"
      strokeLinecap="round"
      fill="none"
      className="tail-wag"
    />
    {/* zZz */}
    <text x="92" y="22" fontSize="10" fontWeight="700" fill="currentColor" opacity="0.6">
      z
    </text>
    <text x="100" y="14" fontSize="8" fontWeight="700" fill="currentColor" opacity="0.4">
      z
    </text>
  </svg>
);

/** Cat mascot for hero / dashboard balance card. */
export const CatMascot: React.FC<CatIconProps> = ({ className, ...props }) => (
  <svg
    viewBox="0 0 100 100"
    fill="none"
    className={cn("h-20 w-20", className)}
    aria-hidden
    {...props}
  >
    {/* ears */}
    <path d="M22 32 L18 12 L36 22 z" fill="currentColor" />
    <path d="M78 32 L82 12 L64 22 z" fill="currentColor" />
    <path d="M24 28 L22 18 L32 23 z" fill="var(--blush)" />
    <path d="M76 28 L78 18 L68 23 z" fill="var(--blush)" />
    {/* head */}
    <circle cx="50" cy="50" r="32" fill="currentColor" />
    {/* cheeks */}
    <circle cx="32" cy="58" r="4" fill="var(--blush)" opacity="0.7" />
    <circle cx="68" cy="58" r="4" fill="var(--blush)" opacity="0.7" />
    {/* eyes */}
    <ellipse cx="40" cy="48" rx="3" ry="4" fill="var(--background)" className="eye-blink" />
    <ellipse cx="60" cy="48" rx="3" ry="4" fill="var(--background)" className="eye-blink" />
    <circle cx="40.5" cy="46.5" r="0.9" fill="currentColor" />
    <circle cx="60.5" cy="46.5" r="0.9" fill="currentColor" />
    {/* nose */}
    <path d="M48 56 L52 56 L50 59 z" fill="var(--background)" />
    {/* mouth */}
    <path
      d="M44 62 q3 3 6 0 q3 3 6 0"
      stroke="var(--background)"
      strokeWidth="1.6"
      strokeLinecap="round"
      fill="none"
    />
    {/* whiskers */}
    <path d="M18 54 L34 56" stroke="var(--background)" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
    <path d="M18 60 L34 60" stroke="var(--background)" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
    <path d="M66 56 L82 54" stroke="var(--background)" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
    <path d="M66 60 L82 60" stroke="var(--background)" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
  </svg>
);

/** Stack of three bouncing paws — playful loading indicator. */
export const PawLoader: React.FC<{ className?: string; label?: string }> = ({
  className,
  label,
}) => (
  <div className={cn("flex flex-col items-center justify-center gap-2", className)}>
    <div className="flex items-end gap-2 text-primary">
      <PawIcon className="h-5 w-5 paw-bounce" style={{ animationDelay: "-0.3s" }} />
      <PawIcon className="h-6 w-6 paw-bounce" style={{ animationDelay: "-0.15s" }} />
      <PawIcon className="h-5 w-5 paw-bounce" />
    </div>
    {label ? (
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
    ) : null}
  </div>
);
