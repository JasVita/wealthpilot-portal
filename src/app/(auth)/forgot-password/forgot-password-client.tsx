"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function ForgotPasswordClient() {
  const [sent, setSent]   = useState(false);
  const router            = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = new FormData(e.currentTarget).get("email") as string;

    const res = await fetch("/api/password/forgot", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email }),
    });

    if (res.ok) {
      setSent(true);
      toast.success(
        "If the account exists, a reset link has been sent to your inbox.",
      );
    } else {
      toast.error("Something went wrong – please try again.");
    }
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* left column (form) */}
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
              <p className="text-center text-sm">
                Check your inbox for a link to reset your password.
              </p>
            ) : (
              <>
                <div className="grid gap-3">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required />
                </div>
                <Button type="submit" className="w-full">
                  Send reset link
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

      {/* right column (cover image) */}
      <div className="relative hidden lg:block">
        <img
          src="/login_cover.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  );
}
