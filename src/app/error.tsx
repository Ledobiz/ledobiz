"use client";

import { useEffect } from "react";
import { errorReference, ServerErrorContent } from "@/components/server-error";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <>
      <title>Something went wrong · Ledobiz</title>
      <SiteNav quoteHref="/#quote" />
      <ServerErrorContent reference={errorReference(error)} onRetry={retry} />
      <SiteFooter quoteHref="/#quote" />
    </>
  );
}
