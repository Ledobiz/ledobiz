"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/admin/actions/auth";
import { btnPrimary, inputClass } from "@/components/admin/ui";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="next" value={next} />
      {state.error && (
        <div role="alert" className="rounded-lg border border-danger bg-danger-tint px-3.5 py-3 text-sm text-danger-ink">
          {state.error}
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium">Work email</label>
        <input id="email" name="email" type="email" autoComplete="username" required defaultValue={state.email} className={inputClass} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className={inputClass} />
      </div>
      <button type="submit" disabled={pending} className={`${btnPrimary} min-h-12 text-base`}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
