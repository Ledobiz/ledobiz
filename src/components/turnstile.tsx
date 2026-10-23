"use client";

import { useEffect, useRef } from "react";

/** The slice of Cloudflare's Turnstile API used here. */
type TurnstileApi = {
  render(container: HTMLElement, options: Record<string, unknown>): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let loading: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) {
    return Promise.resolve(window.turnstile);
  }
  loading ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile didn’t load")));
    script.onerror = () => {
      loading = null;
      reject(new Error("Turnstile didn’t load"));
    };
    document.head.append(script);
  });
  return loading;
}

type Props = {
  siteKey: string;
  /** A fresh token, or null when it expired or failed. */
  onToken: (token: string | null) => void;
  /** Change this number to get a new token (each token can be used only once). */
  resetKey: number;
};

/** Cloudflare's bot check. In Managed mode most people just see a tick; a few get a one-click check. */
export function Turnstile({ siteKey, onToken, resetKey }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const callback = useRef(onToken);

  useEffect(() => {
    callback.current = onToken;
  }, [onToken]);

  useEffect(() => {
    let cancelled = false;
    loadTurnstile()
      .then((api) => {
        if (cancelled || !container.current) {
          return;
        }
        widget.current = api.render(container.current, {
          sitekey: siteKey,
          action: "quote",
          size: "flexible",
          theme: "light",
          callback: (token: string) => callback.current(token),
          "expired-callback": () => callback.current(null),
          "error-callback": () => callback.current(null),
        });
      })
      .catch(() => callback.current(null));
    return () => {
      cancelled = true;
      if (widget.current) {
        window.turnstile?.remove(widget.current);
        widget.current = null;
      }
    };
  }, [siteKey]);

  useEffect(() => {
    if (resetKey > 0 && widget.current) {
      callback.current(null);
      window.turnstile?.reset(widget.current);
    }
  }, [resetKey]);

  return <div ref={container} className="min-h-[65px]" />;
}
