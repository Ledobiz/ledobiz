"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { refreshPayment } from "@/app/pay/actions";

/** Re-checks a pending payment every few seconds (for up to 5 minutes) and refreshes the page when it settles. */
export function PendingRefresh({ reference }: { reference: string }) {
  const router = useRouter();
  useEffect(() => {
    let attempts = 0;
    const timer = setInterval(async () => {
      attempts += 1;
      const status = await refreshPayment(reference).catch(() => "PENDING" as const);
      if (status !== "PENDING" || attempts >= 60) {
        clearInterval(timer);
        router.refresh();
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [reference, router]);
  return null;
}
