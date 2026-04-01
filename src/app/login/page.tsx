import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "@/components/auth/LoginForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sign in — JobRadar",
};

export default async function LoginPage() {
  // Already authenticated — send straight to dashboard
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* Logo / Title */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-blue/10 ring-1 ring-accent-blue/20">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-accent-blue"
              aria-hidden="true"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            JobRadar
          </h1>
          <p className="mt-1 text-sm text-white/40">
            Sign in to your dashboard
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-white/5 bg-background-card p-6 shadow-card">
          {/* Suspense required — LoginForm uses useSearchParams() */}
          <Suspense
            fallback={
              <div className="h-48 animate-pulse rounded-lg bg-white/5" />
            }
          >
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
