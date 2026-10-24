"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cx } from "@/components/admin/ui";

export type NavItem = { href: string; label: string; icon: ReactNode; badge?: { text: string; tone: "gold" | "red" } };

export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="flex flex-col gap-0.5">
      {items.map((item) => {
        const active = item.href === "/zeus" ? pathname === "/zeus" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "flex min-h-[42px] items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium no-underline",
              active ? "bg-river/15 text-white shadow-[inset_3px_0_0_var(--color-river)]" : "text-mist hover:bg-white/5 hover:text-white",
            )}
          >
            {item.icon}
            <span className="flex-1">{item.label}</span>
            {item.badge && (
              <span className={cx("rounded-full px-[7px] text-[11px] leading-4 font-bold text-midnight", item.badge.tone === "gold" ? "bg-gold" : "bg-danger-on-dark")}>
                {item.badge.text}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
