// src/app/(auth)/reset-password/reset-password-client.tsx
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function ResetPasswordClient() {
  const params = useSearchParams();
  const router = useRouter();
  const token  = params.get("token") ?? "";

  const [busy,   setBusy]   = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showPw2,setShowPw2]= useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd  = new FormData(e.currentTarget);
    const pw  = fd.get("password") as string;
    const pw2 = fd.get("confirm")  as string;

    if (pw !== pw2) {
      toast.error("Passwords do not match");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: pw }),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      toast.success("Password updated – you can now log in");
      router.push("/login");
    } catch (err: any) {
      toast.error(err.message ?? "Reset failed");
    } finally { setBusy(false); }
  }

  if (!token) {
    return (
      <p className="m-10 text-center text-red-600">
        Invalid or missing token.
      </p>
    );
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-1 items-center justify-center p-8">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-xs flex flex-col gap-6"
        >
          <h1 className="text-2xl font-bold text-center">Set a new password</h1>

          {/* password */}
          <div className="grid gap-3 relative">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              name="password"
              type={showPw ? "text" : "password"}
              required
            />
            <button
              type="button"
              aria-label={showPw ? "Hide password" : "Show password"}
              onClick={() => setShowPw(v => !v)}
              className="absolute right-3 top-9 text-muted-foreground hover:text-foreground"
            >
              {showPw ? <EyeOff size={18}/> : <Eye size={18}/> }
            </button>
          </div>

          {/* confirm */}
          <div className="grid gap-3 relative">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input
              id="confirm"
              name="confirm"
              type={showPw2 ? "text" : "password"}
              required
            />
            <button
              type="button"
              aria-label={showPw2 ? "Hide password" : "Show password"}
              onClick={() => setShowPw2(v => !v)}
              className="absolute right-3 top-9 text-muted-foreground hover:text-foreground"
            >
              {showPw2 ? <EyeOff size={18}/> : <Eye size={18}/> }
            </button>
          </div>

          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Saving…" : "Save password"}
          </Button>
        </form>
      </div>

      {/* reuse the cover image */}
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
