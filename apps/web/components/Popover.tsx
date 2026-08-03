"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export function Popover({
  open: controlledOpen,
  onOpenChange,
  triggerLabel,
  triggerClassName,
  triggerTitle,
  align = "start",
  disabled = false,
  children,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  triggerLabel: ReactNode;
  triggerClassName?: string;
  triggerTitle?: string;
  align?: "start" | "end";
  disabled?: boolean;
  children: (close: () => void) => ReactNode;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const containerRef = useRef<HTMLDivElement>(null);

  function setOpen(value: boolean) {
    if (isControlled) onOpenChange?.(value);
    else setUncontrolledOpen(value);
  }

  useEffect(() => {
    if (!open) return;
    function handleClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div className="popover-container" ref={containerRef}>
      <button
        type="button"
        className={triggerClassName}
        onClick={() => setOpen(!open)}
        disabled={disabled}
        title={triggerTitle}
      >
        {triggerLabel}
      </button>
      {open && (
        <div className={`popover-panel popover-panel-${align}`}>{children(() => setOpen(false))}</div>
      )}
    </div>
  );
}
