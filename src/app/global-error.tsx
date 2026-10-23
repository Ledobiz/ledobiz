"use client";

import { useEffect } from "react";
import { errorReference, ServerErrorContent } from "@/components/server-error";
import "./globals.css";

/** Replaces the root layout when it fails, so it renders its own document. */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <title>Something went wrong · Ledobiz</title>
        <ServerErrorContent reference={errorReference(error)} onRetry={retry} />
      </body>
    </html>
  );
}
