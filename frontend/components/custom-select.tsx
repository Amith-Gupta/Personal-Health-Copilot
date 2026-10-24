"use client";
import { useEffect, useRef, useState } from "react";
import { CaretDown, Check } from "@phosphor-icons/react";
import { cx } from "./ui";

export interface SelectOption {
  value: string;
  label: string;
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Select...",
  className = "",
  ariaLabel,
  disabled = false,
}: {
  value: string;
  onChange: (val: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel || placeholder}
        className={cx(
          "group flex w-full select-none items-center justify-between text-left transition-all",
          "h-9 rounded-lg border border-line bg-canvas px-3 text-sm text-fg shadow-card",
          "hover:border-fg/40 focus:border-accent focus:shadow-focus focus:outline-none",
          open && "border-accent ring-2 ring-accent/20",
          disabled && "cursor-not-allowed opacity-50",
          className
        )}
      >
        <span className={cx("truncate", !selectedOption && "text-fg-3")}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <CaretDown
          size={13}
          weight="bold"
          className={cx(
            "shrink-0 text-fg-3 transition-transform duration-200 group-hover:text-fg ml-1.5",
            open && "rotate-180 text-accent"
          )}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={ariaLabel || placeholder}
          className="absolute left-0 top-full z-50 mt-1 max-h-56 w-full min-w-[120px] overflow-auto rounded-xl border border-line bg-surface p-1 shadow-pop animate-fade-up focus:outline-none"
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={cx(
                  "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs sm:text-sm transition-colors text-left",
                  isSelected
                    ? "bg-accent-soft font-semibold text-accent"
                    : "text-fg hover:bg-hover hover:text-fg"
                )}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && (
                  <Check size={13} weight="bold" className="shrink-0 text-accent ml-1.5" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
