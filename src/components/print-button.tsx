"use client";

import { PrinterIcon } from "@/components/admin/icons";
import { btnSecondary } from "@/components/admin/ui";

export function PrintButton({ label = "Print or save PDF" }: { label?: string }) {
  return <button type="button" onClick={() => window.print()} className={btnSecondary}><PrinterIcon size={16} />{label}</button>;
}
