import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import { site } from "@/lib/site";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default function LoginPage({ searchParams }: PageProps<"/zeus/login">) {
  return (
    <main className="on-dark flex min-h-dvh items-center justify-center bg-midnight px-4 py-10">
      <div className="flex w-full max-w-[400px] flex-col gap-6">
        <div className="flex items-center justify-center gap-3">
          <Image src={site.logo} alt="Ledobiz" width={150} height={40} unoptimized className="h-10 w-[150px] object-cover" />
          <span className="rounded bg-river px-1.5 py-0.5 text-[10px] font-medium tracking-[0.2em] text-midnight">ADMIN</span>
        </div>
        <section aria-labelledby="signin-title" className="flex flex-col gap-5 rounded-2xl bg-white p-7 text-midnight">
          <div className="flex flex-col gap-1">
            <h1 id="signin-title" className="m-0 font-display text-2xl font-bold">Sign in</h1>
            <p className="m-0 text-sm text-muted">Use your Ledobiz team account.</p>
          </div>
          <Suspense fallback={<div className="h-[228px]" />}>
            <LoginFormWithNext searchParams={searchParams} />
          </Suspense>
        </section>
        <p className="m-0 text-center text-[13px] text-haze">Forgot your password? Ask an admin to reset it in Settings → Team.</p>
      </div>
    </main>
  );
}

async function LoginFormWithNext({ searchParams }: { searchParams: PageProps<"/zeus/login">["searchParams"] }) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "/zeus";
  return <LoginForm next={next} />;
}
