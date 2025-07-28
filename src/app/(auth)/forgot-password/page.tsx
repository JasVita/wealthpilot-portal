"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const router        = useRouter();
  const searchParams  = useSearchParams();
  const alreadySent   = searchParams.get("sent") === "1";
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(alreadySent);

  /* keep local state in sync if the user lands on ?sent=1 directly */
  useEffect(() => { setSent(alreadySent); }, [alreadySent]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email  = new FormData(e.currentTarget).get("email") as string;

    try {
      setBusy(true);
      const res = await fetch("/api/password/forgot", {
        method : "POST",
        body   : JSON.stringify({ email }),
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) throw new Error("Server error");

      toast.success("If the account exists, a reset link has been sent.");
      /* update URL so the user is effectively redirected */
      router.replace("/forgot-password?sent=1");
      // local state will sync via useEffect
    } catch {
      toast.error("Something went wrong – please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* ◀ left column */}
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex flex-1 items-center justify-center">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-xs flex flex-col gap-6"
          >
            <h1 className="text-2xl font-bold text-center">
              Forgot your password?
            </h1>

            {sent ? (
              /* ─── success view ─── */
              <p className="text-center text-sm">
                Check your inbox for a link to reset your password.
              </p>
            ) : (
              /* ─── form view ─── */
              <>
                <div className="grid gap-3">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={busy}
                >
                  {busy ? "Sending…" : "Send reset link"}
                </Button>
              </>
            )}

            <Button
              type="button"
              variant="ghost"
              className="text-sm text-blue-600 underline-offset-4 hover:underline"
              onClick={() => router.push("/login")}
            >
              Back to login
            </Button>
          </form>
        </div>
      </div>

      {/* ▶ right column – same artwork you use on login */}
      <div className="relative hidden lg:block">
        <img
          src="/login_cover.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover
                     dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  );
}
