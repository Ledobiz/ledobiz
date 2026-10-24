"use client";

import { usePathname } from "next/navigation";
import { useEffect, useId, useState, type ReactNode } from "react";
import { cx } from "@/components/admin/ui";
import { CloseIcon, MenuIcon } from "@/components/icons";

/**
 * On phones the sidebar folds into a top bar with a menu button; from the nav breakpoint up it is always open.
 * The menu closes on navigation and on Escape.
 */
export function SidebarMenu({ home, alert, children }: { home: ReactNode; alert?: boolean; children: ReactNode }) {
  const pathname = usePathname();
  // Remembering where it was opened closes it as soon as the page changes.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const menuId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenOn(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <div className="flex items-center gap-3">
        {home}
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpenOn(open ? null : pathname)}
          className="relative inline-flex size-11 flex-none cursor-pointer items-center justify-center rounded-lg border border-white/25 text-white nav:hidden"
        >
          {open ? <CloseIcon size={22} /> : <MenuIcon size={22} />}
          {alert && !open && <span aria-hidden="true" className="absolute top-2 right-2 size-2 rounded-full bg-gold" />}
        </button>
      </div>
      <div id={menuId} className={cx(open ? "flex" : "hidden", "flex-1 flex-col gap-5 pt-4 pb-2 nav:flex nav:p-0")}>
        {children}
      </div>
    </>
  );
}
