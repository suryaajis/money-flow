"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
}

interface SelectProps {
  id?: string;
  value: string | number;
  options: readonly SelectOption[];
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  buttonClassName?: string;
  "aria-label"?: string;
}

interface MenuPosition {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
}

export function Select({
  id,
  value,
  options,
  onValueChange,
  placeholder = "Pilih opsi",
  disabled = false,
  required = false,
  className,
  buttonClassName,
  "aria-label": ariaLabel,
}: SelectProps) {
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const listboxId = React.useId();
  const [open, setOpen] = React.useState(false);
  const [highlighted, setHighlighted] = React.useState(-1);
  const [position, setPosition] = React.useState<MenuPosition | null>(null);

  const stringValue = String(value ?? "");
  const selectedIndex = options.findIndex(
    (option) => option.value === stringValue,
  );
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  const firstEnabled = React.useCallback(
    () => options.findIndex((option) => !option.disabled),
    [options],
  );

  const updatePosition = React.useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const viewportPadding = 10;
    const viewportTop = 86;
    const gap = 6;
    const preferredHeight = Math.min(288, options.length * 44 + 12);
    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
    const spaceAbove = rect.top - viewportTop;
    const openAbove =
      spaceBelow < Math.min(preferredHeight, 180) && spaceAbove > spaceBelow;
    const available = openAbove ? spaceAbove : spaceBelow;
    const maxHeight = Math.max(96, Math.min(preferredHeight, available - gap));
    const width = Math.max(rect.width, 180);
    const left = Math.min(
      Math.max(viewportPadding, rect.left),
      window.innerWidth - width - viewportPadding,
    );

    setPosition({
      left,
      top: openAbove
        ? Math.max(viewportTop, rect.top - maxHeight - gap)
        : rect.bottom + gap,
      width,
      maxHeight,
    });
  }, [options.length]);

  React.useLayoutEffect(() => {
    if (!open) return;
    updatePosition();

    const close = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !buttonRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    const reposition = () => updatePosition();

    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    document.addEventListener("pointerdown", close);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
      document.removeEventListener("pointerdown", close);
    };
  }, [open, updatePosition]);

  React.useEffect(() => {
    if (!open) return;
    setHighlighted(
      selectedIndex >= 0 && !options[selectedIndex]?.disabled
        ? selectedIndex
        : firstEnabled(),
    );
  }, [open, selectedIndex, options, firstEnabled]);

  function moveHighlight(direction: 1 | -1) {
    if (!options.length) return;
    let next = highlighted;
    for (let count = 0; count < options.length; count += 1) {
      next = (next + direction + options.length) % options.length;
      if (!options[next]?.disabled) {
        setHighlighted(next);
        requestAnimationFrame(() => {
          menuRef.current
            ?.querySelector<HTMLElement>(`[data-option-index="${next}"]`)
            ?.scrollIntoView({ block: "nearest" });
        });
        return;
      }
    }
  }

  function choose(option: SelectOption) {
    if (option.disabled) return;
    onValueChange(option.value);
    setOpen(false);
    buttonRef.current?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Tab" && open) {
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) setOpen(true);
      else moveHighlight(event.key === "ArrowDown" ? 1 : -1);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!open) setOpen(true);
      else if (highlighted >= 0) choose(options[highlighted]);
      return;
    }
    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
    }
    if (event.key === "Home" && open) {
      event.preventDefault();
      setHighlighted(firstEnabled());
    }
    if (event.key === "End" && open) {
      event.preventDefault();
      for (let index = options.length - 1; index >= 0; index -= 1) {
        if (!options[index].disabled) {
          setHighlighted(index);
          break;
        }
      }
    }
  }

  const menu = open && position ? (
    <div
      ref={menuRef}
      id={listboxId}
      role="listbox"
      aria-label={ariaLabel}
      className="fixed z-[100] overflow-y-auto rounded-xl border border-border bg-popover/98 p-1.5 text-popover-foreground shadow-[0_18px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl"
      style={{
        left: position.left,
        top: position.top,
        width: position.width,
        maxHeight: position.maxHeight,
      }}
    >
      {options.map((option, index) => {
        const active = option.value === stringValue;
        const focused = index === highlighted;
        return (
          <button
            key={`${option.value}-${index}`}
            id={`${listboxId}-option-${index}`}
            type="button"
            role="option"
            aria-selected={active}
            disabled={option.disabled}
            data-option-index={index}
            onPointerMove={() => !option.disabled && setHighlighted(index)}
            onClick={() => choose(option)}
            className={cn(
              "flex min-h-10 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
              focused && "bg-accent text-accent-foreground",
              active && "font-semibold text-foreground",
              option.disabled && "cursor-not-allowed opacity-45",
            )}
          >
            <span className="min-w-0 flex-1 truncate">{option.label}</span>
            <Check
              className={cn(
                "h-4 w-4 shrink-0 text-primary transition-opacity",
                active ? "opacity-100" : "opacity-0",
              )}
            />
          </button>
        );
      })}
    </div>
  ) : null;

  return (
    <div className={cn("relative min-w-0", className)}>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-controls={listboxId}
        aria-activedescendant={
          open && highlighted >= 0
            ? `${listboxId}-option-${highlighted}`
            : undefined
        }
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-required={required || undefined}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex h-11 w-full items-center rounded-xl border border-input bg-card/80 px-3.5 py-2 text-left text-base shadow-sm transition-[border-color,box-shadow,background-color] sm:h-10 sm:text-sm",
          "focus-visible:border-primary/60 focus-visible:bg-card focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10",
          "disabled:cursor-not-allowed disabled:opacity-50",
          open && "border-primary/60 bg-card ring-4 ring-primary/10",
          buttonClassName,
        )}
      >
        <span
          className={cn(
            "min-w-0 flex-1 truncate",
            !selected && "text-muted-foreground",
          )}
        >
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          className={cn(
            "ml-2 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180 text-primary",
          )}
        />
      </button>
      {typeof document !== "undefined" && menu
        ? createPortal(menu, document.body)
        : null}
    </div>
  );
}
