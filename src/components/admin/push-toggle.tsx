"use client";

import { useEffect, useState } from "react";
import { btnSmall } from "@/components/admin/ui";

/** The slice of the OneSignal Web SDK (v16) this page uses. */
type OneSignalSdk = {
  init(options: { appId: string; autoResubscribe?: boolean }): Promise<void>;
  login(externalId: string): Promise<void>;
  logout(): Promise<void>;
  Notifications: { permission: boolean; isPushSupported(): boolean };
  User: { PushSubscription: { optedIn?: boolean; optIn(): Promise<void>; optOut(): Promise<void> } };
};

declare global {
  interface Window {
    OneSignalDeferred?: ((sdk: OneSignalSdk) => void | Promise<void>)[];
  }
}

const SDK_URL = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
let ready: Promise<OneSignalSdk> | null = null;

// OneSignal may only be initialised once per page, so every toggle shares one load.
function loadOneSignal(appId: string): Promise<OneSignalSdk> {
  ready ??= new Promise((resolve, reject) => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (sdk) => {
      await sdk.init({ appId, autoResubscribe: true });
      resolve(sdk);
    });
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.defer = true;
    script.onerror = () => {
      ready = null;
      reject(new Error("Couldn’t load OneSignal"));
    };
    document.head.append(script);
  });
  return ready;
}

type State = "loading" | "unsupported" | "blocked" | "off" | "on" | "error";

const labels: Record<State, string> = {
  loading: "Checking this device…",
  unsupported: "This browser can’t show alerts. On a phone, open the admin in Chrome.",
  blocked: "Alerts are blocked for this site. Allow notifications in the browser’s site settings, then reload.",
  off: "Off on this device",
  on: "On for this device",
  error: "Couldn’t reach OneSignal. Check your connection or ad blocker, then reload.",
};

/** Turns new-quote alerts on or off for the browser it's opened in (phone or computer). */
export function PushToggle({ appId, userId }: { appId: string; userId: string }) {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    loadOneSignal(appId)
      .then(async (sdk) => {
        if (!sdk.Notifications.isPushSupported()) {
          return "unsupported" as const;
        }
        if (Notification.permission === "denied") {
          return "blocked" as const;
        }
        if (sdk.Notifications.permission && sdk.User.PushSubscription.optedIn) {
          // Keeps this device linked to the signed-in admin.
          await sdk.login(userId);
          return "on" as const;
        }
        return "off" as const;
      })
      .catch(() => "error" as const)
      .then((next) => active && setState(next));
    return () => {
      active = false;
    };
  }, [appId, userId]);

  async function toggle() {
    setBusy(true);
    try {
      const sdk = await loadOneSignal(appId);
      if (state === "on") {
        await sdk.User.PushSubscription.optOut();
        await sdk.logout();
        setState("off");
      } else {
        await sdk.login(userId);
        await sdk.User.PushSubscription.optIn();
        setState(Notification.permission === "denied" ? "blocked" : sdk.Notifications.permission ? "on" : "off");
      }
    } catch (cause) {
      console.error("Push toggle failed", cause);
      setState("error");
    } finally {
      setBusy(false);
    }
  }

  const canToggle = state === "on" || state === "off";
  return (
    <span className="flex flex-col items-start gap-2">
      <span aria-live="polite" className="text-[13px] text-muted">{labels[state]}</span>
      {canToggle && (
        <button type="button" onClick={toggle} disabled={busy} className={btnSmall}>
          {busy ? "One moment…" : state === "on" ? "Turn off on this device" : "Turn on alerts on this device"}
        </button>
      )}
    </span>
  );
}
