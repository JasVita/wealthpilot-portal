"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";   // ← new
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);

  /* ─── submit handler ─── */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd   = new FormData(e.currentTarget);
    const email = fd.get("email")    as string;
    const pw    = fd.get("password") as string;
    const pw2   = fd.get("confirm")  as string;

    if (pw !== pw2) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      const res  = await fetch("/api/signup", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, password: pw }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      toast.success("Account created – please log in");
      router.push("/login?new=1");
    } catch (err: any) {
      toast.error(err.message ?? "Sign‑up failed");
    }
  };

  /* ─── render ─── */
  return (
    <form
      onSubmit={handleSubmit}
      autoComplete="nope"
      className={cn("flex flex-col gap-6", className)}
      {...props}
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Create your account</h1>
        <p className="text-muted-foreground text-sm text-balance">
          Enter your email below to get started
        </p>
      </div>

      <div className="grid gap-6">
        {/* Email */}
        <div className="grid gap-3">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>

        {/* Password */}
        <div className="grid gap-3">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPw ? "text" : "password"}
              required
              autoComplete="nope"
            />
            <button
              type="button"
              aria-label={showPw ? "Hide password" : "Show password"}
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div className="grid gap-3">
          <Label htmlFor="confirm">Confirm Password</Label>
          <div className="relative">
            <Input
              id="confirm"
              name="confirm"
              type={showPw2 ? "text" : "password"}
              required
              autoComplete="nope"
            />
            <button
              type="button"
              aria-label={showPw2 ? "Hide password" : "Show password"}
              onClick={() => setShowPw2((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPw2 ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* Primary action */}
        <Button type="submit" className="w-full">
          Sign up
        </Button>

        {/* Inline labeled separator */}
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <div className="h-px flex-1 bg-muted-foreground/20" />
          or
          <div className="h-px flex-1 bg-muted-foreground/20" />
        </div>

        {/* Secondary action: same style as primary */}
        <Button
          type="button"
          className="w-full"
          onClick={() => router.push("/login")}
        >
          Back to Login
        </Button>
      </div>
    </form>
  );
}
