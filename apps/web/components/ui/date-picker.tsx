"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isValid,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

interface CalendarPosition {
  left: number;
  top: number;
  width: number;
}

const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

function valueToDate(value: string): Date | null {
  if (!value) return null;
  const date = parseISO(value);
  return isValid(date) ? date : null;
}

export function DatePicker({
  id,
  value,
  onValueChange,
  min,
  max,
  placeholder = "Pilih tanggal",
  required = false,
  disabled = false,
  className,
  "aria-label": ariaLabel,
}: DatePickerProps) {
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const calendarRef = React.useRef<HTMLDivElement>(null);
  const dialogId = React.useId();
  const selectedDate = valueToDate(value);
  const [open, setOpen] = React.useState(false);
  const [visibleMonth, setVisibleMonth] = React.useState(() =>
    startOfMonth(selectedDate ?? new Date()),
  );
  const [position, setPosition] = React.useState<CalendarPosition | null>(null);

  const updatePosition = React.useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const padding = 10;
    const viewportTop = 86;
    const gap = 6;
    const width = Math.min(312, window.innerWidth - padding * 2);
    const calendarHeight = 382;
    const spaceBelow = window.innerHeight - rect.bottom - padding;
    const spaceAbove = rect.top - viewportTop;
    const openAbove = spaceBelow < calendarHeight && spaceAbove > spaceBelow;
    const left = Math.min(
      Math.max(padding, rect.left),
      window.innerWidth - width - padding,
    );
    setPosition({
      left,
      top: openAbove
        ? Math.max(viewportTop, rect.top - calendarHeight - gap)
        : Math.max(
            viewportTop,
            Math.min(
              rect.bottom + gap,
              window.innerHeight - calendarHeight - padding,
            ),
          ),
      width,
    });
  }, []);

  React.useLayoutEffect(() => {
    if (!open) return;
    updatePosition();

    const close = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !buttonRef.current?.contains(target) &&
        !calendarRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    const reposition = () => updatePosition();
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", close);
    window.addEventListener("keydown", escape);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      document.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", escape);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open, updatePosition]);

  const monthStart = startOfMonth(visibleMonth);
  const days = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(monthStart), { weekStartsOn: 1 }),
  });

  function isDisabledDate(date: Date) {
    const iso = format(date, "yyyy-MM-dd");
    return (min ? iso < min : false) || (max ? iso > max : false);
  }

  function openCalendar() {
    if (disabled) return;
    setVisibleMonth(startOfMonth(selectedDate ?? new Date()));
    setOpen((current) => !current);
  }

  function selectDate(date: Date) {
    if (isDisabledDate(date)) return;
    onValueChange(format(date, "yyyy-MM-dd"));
    setOpen(false);
    buttonRef.current?.focus();
  }

  const calendar = open && position ? (
    <div
      ref={calendarRef}
      id={dialogId}
      role="dialog"
      aria-label={ariaLabel ?? "Pilih tanggal"}
      className="fixed z-[100] rounded-2xl border border-border bg-popover/98 p-3 text-popover-foreground shadow-[0_22px_70px_rgba(0,0,0,0.32)] backdrop-blur-xl dark:shadow-[0_24px_80px_rgba(0,0,0,0.72),0_0_0_1px_rgba(201,244,90,0.08)]"
      style={{ left: position.left, top: position.top, width: position.width }}
    >
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setVisibleMonth((month) => subMonths(month, 1))}
          aria-label="Bulan sebelumnya"
          className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-bold capitalize tracking-[-0.015em]">
          {format(visibleMonth, "MMMM yyyy", { locale: idLocale })}
        </p>
        <button
          type="button"
          onClick={() => setVisibleMonth((month) => addMonths(month, 1))}
          aria-label="Bulan berikutnya"
          className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1" aria-hidden="true">
        {WEEKDAYS.map((day) => (
          <span
            key={day}
            className="flex h-7 items-center justify-center text-[10px] font-bold uppercase tracking-wide text-muted-foreground"
          >
            {day}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const selected = selectedDate ? isSameDay(day, selectedDate) : false;
          const today = isSameDay(day, new Date());
          const outside = !isSameMonth(day, visibleMonth);
          const dayDisabled = isDisabledDate(day);
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => selectDate(day)}
              disabled={dayDisabled}
              aria-label={format(day, "d MMMM yyyy", { locale: idLocale })}
              aria-pressed={selected}
              className={cn(
                "focus-ring relative flex aspect-square items-center justify-center rounded-xl text-sm transition-[color,background-color,transform] hover:bg-accent hover:text-accent-foreground",
                outside && "text-muted-foreground/45",
                today && !selected && "font-bold text-primary ring-1 ring-primary/35",
                selected &&
                  "bg-primary font-bold text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary hover:text-primary-foreground",
                dayDisabled && "cursor-not-allowed opacity-25 hover:bg-transparent",
              )}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-border/70 pt-3">
        {!required ? (
          <button
            type="button"
            onClick={() => {
              onValueChange("");
              setOpen(false);
            }}
            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            Hapus tanggal
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          disabled={isDisabledDate(new Date())}
          onClick={() => {
            setVisibleMonth(startOfMonth(new Date()));
            selectDate(new Date());
          }}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
        >
          Hari ini
        </button>
      </div>
    </div>
  ) : null;

  return (
    <div className={cn("relative min-w-0", className)}>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={dialogId}
        aria-required={required || undefined}
        onClick={openCalendar}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && !open) {
            event.preventDefault();
            openCalendar();
          }
          if (event.key === "Tab" && open) setOpen(false);
        }}
        className={cn(
          "flex h-11 w-full items-center rounded-xl border border-input bg-card/80 px-3.5 py-2 text-left text-base shadow-sm transition-[border-color,box-shadow,background-color] sm:h-10 sm:text-sm",
          "focus-visible:border-primary/60 focus-visible:bg-card focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10",
          "disabled:cursor-not-allowed disabled:opacity-50",
          open && "border-primary/60 bg-card ring-4 ring-primary/10",
        )}
      >
        <span className={cn("min-w-0 flex-1", !selectedDate && "text-muted-foreground")}>
          {selectedDate
            ? format(selectedDate, "dd/MM/yyyy")
            : placeholder}
        </span>
        <CalendarDays
          className={cn(
            "ml-2 h-4 w-4 shrink-0 text-muted-foreground transition-colors",
            open && "text-primary",
          )}
        />
      </button>
      {typeof document !== "undefined" && calendar
        ? createPortal(calendar, document.body)
        : null}
    </div>
  );
}
