import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export const btnPrimary =
  "inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-midnight px-4 text-sm font-medium text-white no-underline hover:bg-midnight-hover disabled:cursor-not-allowed disabled:opacity-50";
export const btnSecondary =
  "inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-control bg-white px-4 text-sm font-medium text-midnight no-underline hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50";
export const btnWarn =
  "inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#e0a54d] bg-[#fff1db] px-4 text-sm font-medium text-[#7a4800] no-underline hover:bg-[#ffe3b3]";
export const btnSmall =
  "inline-flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-control bg-white px-3 text-[13px] font-medium text-midnight no-underline hover:bg-surface disabled:opacity-50";
export const inputClass =
  "min-h-10 w-full rounded-lg border border-control bg-white px-3 text-sm text-midnight placeholder:text-[#6b7389] disabled:bg-surface";
export const textareaClass = "w-full rounded-lg border border-control bg-white px-3 py-2.5 text-sm leading-[21px] text-midnight placeholder:text-[#6b7389]";

export type Tone = "ok" | "warn" | "bad" | "info" | "neutral";

const toneClasses: Record<Tone, string> = {
  ok: "bg-[#e3f6ee] text-[#1a7f5a]",
  warn: "bg-[#fff1db] text-[#7a4800]",
  bad: "bg-[#fdecec] text-[#b42323]",
  info: "bg-tint text-[#15627b]",
  neutral: "bg-surface text-muted",
};

export function Chip({ tone, children, className }: { tone: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cx("inline-flex min-h-6 items-center rounded-full px-2.5 text-xs font-medium whitespace-nowrap", toneClasses[tone], className)}>
      {children}
    </span>
  );
}

export function Card({ children, className, ...props }: ComponentProps<"section">) {
  return (
    <section className={cx("rounded-xl border border-line bg-white", className)} {...props}>
      {children}
    </section>
  );
}

export function CardHeader({ title, subtitle, action, id }: { title: string; subtitle?: ReactNode; action?: ReactNode; id?: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
      <div className="flex flex-col gap-0.5">
        <h2 id={id} className="m-0 font-display text-lg leading-6 font-semibold">{title}</h2>
        {subtitle && <span className="text-[13px] text-muted">{subtitle}</span>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions, breadcrumb }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; breadcrumb?: { href: string; label: string }[] }) {
  return (
    <header className="flex flex-col gap-3">
      {breadcrumb && (
        <nav aria-label="Breadcrumb" className="flex flex-wrap gap-2 text-sm text-muted">
          {breadcrumb.map((crumb, index) => (
            <span key={crumb.href} className="flex gap-2">
              {index > 0 && <span aria-hidden="true">/</span>}
              <Link href={crumb.href} className="text-link">{crumb.label}</Link>
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="m-0 font-display text-[28px] leading-9 font-bold">{title}</h1>
          {subtitle && <div className="text-sm text-muted">{subtitle}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
      </div>
    </header>
  );
}

export function Stat({ label, value, note, noteTone = "neutral" }: { label: string; value: ReactNode; note?: ReactNode; noteTone?: Tone }) {
  const noteColor = { ok: "text-success", warn: "text-[#7a4800]", bad: "text-[#b42323]", info: "text-[#15627b]", neutral: "text-muted" }[noteTone];
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-line bg-white px-4 py-3.5">
      <span className="text-[13px] text-muted">{label}</span>
      <strong className="font-display text-[22px] leading-7">{value}</strong>
      {note && <span className={cx("text-xs", noteColor)}>{note}</span>}
    </div>
  );
}

export function Field({ label, htmlFor, hint, error, children, className }: { label: ReactNode; htmlFor: string; hint?: ReactNode; error?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cx("flex min-w-0 flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium">{label}</label>
      {children}
      {hint && !error && <span className="text-xs text-muted">{hint}</span>}
      {error && <span className="text-[13px] text-danger">{error}</span>}
    </div>
  );
}

export function ProgressBar({ value, tone = "info", label }: { value: number; tone?: Tone; label: string }) {
  const fill = { ok: "bg-salsify", warn: "bg-gold", bad: "bg-danger", info: "bg-river", neutral: "bg-control" }[tone];
  return (
    <span role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} className="block h-2 flex-1 overflow-hidden rounded-full bg-line">
      <span className={cx("block h-full rounded-full", fill)} style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }} />
    </span>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <strong>{title}</strong>
      {children && <div className="max-w-[440px] text-sm text-muted">{children}</div>}
    </div>
  );
}

export function Notice({ tone, children }: { tone: Tone; children: ReactNode }) {
  const styles = { ok: "border-[#a6dcc3] bg-[#e3f6ee] text-[#145c41]", warn: "border-[#e0a54d] bg-[#fff1db] text-[#7a4800]", bad: "border-[#f1b4b4] bg-[#fdecec] text-[#7d1a1a]", info: "border-[#b8dfec] bg-tint text-[#15627b]", neutral: "border-line bg-surface text-muted" }[tone];
  return <div role={tone === "bad" ? "alert" : "status"} className={cx("rounded-xl border px-4 py-3 text-sm leading-5", styles)}>{children}</div>;
}

export function Avatar({ name, color = "bg-river" }: { name: string; color?: string }) {
  const letters = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
  return (
    <span aria-hidden="true" className={cx("inline-flex size-8 flex-none items-center justify-center rounded-full text-xs font-bold text-midnight", color)}>
      {letters}
    </span>
  );
}

export const avatarColors = ["bg-river", "bg-salsify", "bg-gold", "bg-mist"];

/** Table shell with consistent header styling; pass <tr> rows as children. */
export function DataTable({ head, children, minWidth = 760, caption }: { head: { label: string; align?: "right" | "left"; srOnly?: boolean }[]; children: ReactNode; minWidth?: number; caption?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm" style={{ minWidth }}>
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="bg-surface text-left text-xs tracking-[0.04em] text-muted">
            {head.map((column, index) => (
              <th key={`${column.label}-${index}`} scope="col" className={cx("px-3 py-2.5 font-medium first:pl-5 last:pr-5", column.align === "right" && "text-right")}>
                {column.srOnly ? <span className="sr-only">{column.label}</span> : column.label.toUpperCase()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export const td = "border-t border-line px-3 py-3 align-middle first:pl-5 last:pr-5";
