"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { btnPrimary, btnSmall, Chip, cx } from "@/components/admin/ui";

/** The slice of the OneSignal Web SDK (v16) this page uses. */
type OneSignalSdk = {
  init(options: { appId: string; autoResubscribe?: boolean; allowLocalhostAsSecureOrigin?: boolean }): Promise<void>;
  login(externalId: string): Promise<void>;
  logout(): Promise<void>;
  Notifications: { permission: boolean; isPushSupported(): boolean };
  User: { PushSubscription: { id?: string | null; optedIn?: boolean; optIn(): Promise<void>; optOut(): Promise<void> } };
};

declare global {
  interface Window {
    OneSignalDeferred?: ((sdk: OneSignalSdk) => void | Promise<void>)[];
  }
}

export type PushDeviceView = { id: string; browser: string; device: string | null; enabled: boolean };

const SDK_URL = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
let ready: Promise<OneSignalSdk> | null = null;

// OneSignal may only be initialised once per page, so every toggle shares one load.
function loadOneSignal(appId: string): Promise<OneSignalSdk> {
  ready ??= new Promise<OneSignalSdk>((resolve, reject) => {
    // OneSignal never answers when the page's address isn't the app's Site URL, so give up after a while.
    const timer = setTimeout(() => reject(new Error("timeout")), 15_000);
    const local = ["localhost", "127.0.0.1"].includes(window.location.hostname);
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (sdk) => {
      try {
        await sdk.init({ appId, autoResubscribe: true, ...(local ? { allowLocalhostAsSecureOrigin: true } : {}) });
        clearTimeout(timer);
        resolve(sdk);
      } catch (cause) {
        clearTimeout(timer);
        reject(cause instanceof Error ? cause : new Error(String(cause)));
      }
    });
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.defer = true;
    script.onerror = () => {
      clearTimeout(timer);
      reject(new Error("blocked"));
    };
    document.head.append(script);
  }).catch((cause: unknown) => {
    // A failed load can be retried.
    ready = null;
    throw cause;
  });
  return ready;
}

type State = "loading" | "unsupported" | "blocked" | "off" | "on" | "error";

/** Links this browser (laptop, phone…) to the signed-in admin for new-quote alerts, and lists linked devices. */
export function PushToggle({ appId, userId, devices, devicesError }: { appId: string; userId: string; devices: PushDeviceView[]; devicesError?: string }) {
  const router = useRouter();
  const [state, setState] = useState<State>("loading");
  const [problem, setProblem] = useState<string>();
  const [thisDevice, setThisDevice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);

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
          if (active) {
            setThisDevice(sdk.User.PushSubscription.id ?? null);
          }
          return "on" as const;
        }
        return "off" as const;
      })
      .catch((cause: unknown) => {
        if (active) {
          setProblem(explain(cause));
        }
        return "error" as const;
      })
      .then((next) => active && setState(next));
    return () => {
      active = false;
    };
  }, [appId, userId, attempt]);

  async function toggle() {
    setBusy(true);
    setProblem(undefined);
    try {
      const sdk = await loadOneSignal(appId);
      if (state === "on") {
        await sdk.User.PushSubscription.optOut();
        await sdk.logout();
        setThisDevice(null);
        setState("off");
      } else {
        await sdk.login(userId);
        await sdk.User.PushSubscription.optIn();
        const next = Notification.permission === "denied" ? "blocked" : sdk.Notifications.permission ? "on" : "off";
        setThisDevice(next === "on" ? (sdk.User.PushSubscription.id ?? null) : null);
        setState(next);
      }
      // OneSignal takes a moment to register the device before it shows in the list.
      setTimeout(() => router.refresh(), 2500);
    } catch (cause) {
      console.error("Push toggle failed", cause);
      setProblem(explain(cause));
      setState("error");
    } finally {
      setBusy(false);
    }
  }

  const active = devices.filter((device) => device.enabled);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <span className="flex items-center justify-between gap-2">
          <strong className="text-sm">This device</strong>
          <Chip tone={state === "on" ? "ok" : state === "loading" ? "neutral" : state === "off" ? "info" : "warn"}>
            {{ loading: "Checking…", on: "Alerts on", off: "Not connected", blocked: "Blocked", unsupported: "Not supported", error: "Couldn’t connect" }[state]}
          </Chip>
        </span>
        <span aria-live="polite" className="text-[13px] text-muted">
          {state === "loading" && "Loading OneSignal…"}
          {state === "off" && "Connect this browser to get a notification for every new quote request, even when this tab is closed."}
          {state === "on" && "New quote requests will show up as notifications on this device."}
          {state === "blocked" && "Notifications are blocked for this site. Allow them in the browser’s site settings (the icon left of the address bar), then reload."}
          {state === "unsupported" && "This browser can’t receive web push. On Android use Chrome; on a computer use Chrome, Edge, Firefox or Safari."}
          {state === "error" && problem}
        </span>
        {(state === "off" || state === "on") && (
          <button type="button" onClick={toggle} disabled={busy} className={cx(state === "on" ? btnSmall : btnPrimary, "self-start")}>
            {busy ? "One moment…" : state === "on" ? "Disconnect this device" : "Connect this device"}
          </button>
        )}
        {state === "error" && (
          <button type="button" onClick={() => { setState("loading"); setAttempt((value) => value + 1); }} className={cx(btnSmall, "self-start")}>Try again</button>
        )}
      </div>

      <div className="flex flex-col gap-1.5 border-t border-line pt-3">
        <strong className="text-sm">Your connected devices ({active.length})</strong>
        {devicesError ? (
          <span className="text-[13px] text-danger">{devicesError}</span>
        ) : active.length === 0 ? (
          <span className="text-[13px] text-muted">None yet. Open this page on each laptop and phone you want alerts on, and tap “Connect this device”.</span>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[13px]">
            {active.map((device) => (
              <li key={device.id} className="flex flex-wrap items-center gap-x-2">
                <span className="font-medium">{device.browser}</span>
                {device.device && <span className="text-muted">{device.device}</span>}
                {device.id === thisDevice && <span className="rounded bg-tint px-1.5 text-xs text-[#15627b]">this device</span>}
              </li>
            ))}
          </ul>
        )}
        <span className="text-[13px] text-muted">To add your phone: open the admin in Chrome on the phone, sign in, go to Settings and tap “Connect this device” there.</span>
      </div>
    </div>
  );
}

function explain(cause: unknown): string {
  const message = cause instanceof Error ? cause.message : String(cause);
  const here = typeof window === "undefined" ? "" : window.location.origin;
  if (message === "blocked") {
    return "OneSignal couldn’t load. An ad or tracker blocker may be stopping it: allow cdn.onesignal.com for this site, then try again.";
  }
  if (message === "timeout" || /can only be used on|site url|origin/i.test(message)) {
    return `OneSignal didn’t accept this address (${here}). Push only works on the Site URL set in your OneSignal app, usually https://ledobiz.com. Open the admin there, or make a separate OneSignal app for local testing.`;
  }
  return `OneSignal couldn’t start: ${message}`;
}
