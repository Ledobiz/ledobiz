"use client";

import { useState } from "react";
import { moneyShort } from "@/lib/admin/format";

export type MonthPoint = { label: string; revenue: number; expenses: number };

const REVENUE = "#2a8fb3";
const EXPENSES = "#d97f00";

/** Grouped monthly bars on one axis, with a hover tooltip and a table view for screen readers. */
export function RevenueChart({ data, currency }: { data: MonthPoint[]; currency: string }) {
  const [active, setActive] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const max = Math.max(1, ...data.flatMap((point) => [point.revenue, point.expenses]));
  const step = niceStep(max / 4);
  const top = Math.ceil(max / step) * step;
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, index) => index * step);
  const width = 720;
  const height = 240;
  const left = 56;
  const bottom = 26;
  const plotW = width - left - 8;
  const plotH = height - bottom - 10;
  const band = plotW / data.length;
  const barW = Math.min(14, (band - 10) / 2);
  const y = (value: number) => 10 + plotH - (value / top) * plotH;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-4 text-[13px] text-muted">
          <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: REVENUE }} />Revenue received</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: EXPENSES }} />Expenses</span>
        </div>
        <button type="button" onClick={() => setShowTable((value) => !value)} className="cursor-pointer text-[13px] text-link underline">{showTable ? "Show chart" : "Show as table"}</button>
      </div>
      {showTable ? (
        <table className="w-full border-collapse text-sm">
          <thead><tr className="text-left text-xs text-muted"><th className="py-1.5 font-medium">MONTH</th><th className="py-1.5 text-right font-medium">REVENUE</th><th className="py-1.5 text-right font-medium">EXPENSES</th><th className="py-1.5 text-right font-medium">PROFIT</th></tr></thead>
          <tbody>
            {data.map((point) => (
              <tr key={point.label} className="border-t border-line">
                <td className="py-1.5">{point.label}</td>
                <td className="py-1.5 text-right">{moneyShort(point.revenue, currency)}</td>
                <td className="py-1.5 text-right">{moneyShort(point.expenses, currency)}</td>
                <td className="py-1.5 text-right font-medium">{moneyShort(point.revenue - point.expenses, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="relative overflow-x-auto">
          <svg viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full min-w-[560px]" role="img" aria-label="Monthly revenue and expenses for the last 12 months" onMouseLeave={() => setActive(null)}>
            {ticks.map((tick) => (
              <g key={tick}>
                <line x1={left} x2={width - 8} y1={y(tick)} y2={y(tick)} stroke="#e6eaf1" strokeWidth={1} />
                <text x={left - 8} y={y(tick) + 4} textAnchor="end" fontSize={11} fill="#5b6478">{moneyShort(tick, currency)}</text>
              </g>
            ))}
            {data.map((point, index) => {
              const x = left + index * band + band / 2;
              return (
                <g key={point.label} onMouseEnter={() => setActive(index)} onFocus={() => setActive(index)} tabIndex={0} aria-label={`${point.label}: revenue ${moneyShort(point.revenue, currency)}, expenses ${moneyShort(point.expenses, currency)}`} className="outline-none">
                  <rect x={left + index * band} y={10} width={band} height={plotH} fill={active === index ? "#f3f5f9" : "transparent"} />
                  <Bar x={x - barW - 1} width={barW} top={y(point.revenue)} base={y(0)} color={REVENUE} />
                  <Bar x={x + 1} width={barW} top={y(point.expenses)} base={y(0)} color={EXPENSES} />
                  <text x={x} y={height - 8} textAnchor="middle" fontSize={11} fill="#5b6478">{point.label.split(" ")[0]}</text>
                </g>
              );
            })}
          </svg>
          {active !== null && data[active] && (
            <div role="status" className="pointer-events-none absolute top-2 rounded-lg border border-line bg-white px-3 py-2 text-[13px] shadow-[0_4px_16px_rgba(0,0,51,.1)]" style={{ left: `clamp(0px, calc(${((left + active * band + band) / width) * 100}% + 4px), calc(100% - 180px))` }}>
              <strong className="block">{data[active].label}</strong>
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm" style={{ background: REVENUE }} />Revenue {moneyShort(data[active].revenue, currency)}</span>
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm" style={{ background: EXPENSES }} />Expenses {moneyShort(data[active].expenses, currency)}</span>
              <span className="mt-0.5 block border-t border-line pt-0.5 font-medium">Profit {moneyShort(data[active].revenue - data[active].expenses, currency)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Bar({ x, width, top, base, color }: { x: number; width: number; top: number; base: number; color: string }) {
  const h = base - top;
  if (h <= 0) {
    return null;
  }
  const r = Math.min(4, h, width / 2);
  // Rounded data end at the top, square at the baseline.
  return <path d={`M${x},${base} V${top + r} Q${x},${top} ${x + r},${top} H${x + width - r} Q${x + width},${top} ${x + width},${top + r} V${base} Z`} fill={color} />;
}

function niceStep(raw: number): number {
  const power = 10 ** Math.floor(Math.log10(Math.max(raw, 1)));
  const scaled = raw / power;
  return (scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10) * power;
}
