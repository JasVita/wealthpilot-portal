"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/stores/user-store";
import { useClientStore } from "@/stores/clients-store";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const router = useRouter();
  const { setUsername, setID } = useUserStore();
  const { loadClients } = useClientStore();
  const [showPw, setShowPw] = useState(false);

  /* ─── submit handler ─── */
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formEl   = event.currentTarget;
    const formData = new FormData(formEl);

    const email    = formData.get("email")    as string;
    const password = formData.get("password") as string;

    try {
      const res  = await fetch("/api/manual-login", {
        method: "POST",
        body:   JSON.stringify({ email, password }),
        headers:{ "Content-Type": "application/json" },
      });

      const isJson = res.headers.get("content-type")?.includes("application/json");
      const data   = isJson
        ? await res.json()
        : { success: false, message: "Unexpected server response." };

      if (!data.success || !data.user) throw new Error(data.message || "Login failed");

      setUsername(data.user.email);
      setID(data.user.id);

      try { await loadClients(); }
      catch (err) {
        console.error("[login-form] loadClients error", err);
        toast.error("Could not load client data, but login succeeded.");
      }

      formEl.reset();
      toast.success("Logged in successfully 🎉");
      router.push("/clients-dashboard");
    } catch (err: any) {
      toast.error(err.message || "Login failed");
      console.error("[login-form] submit error:", err);
    }
  };

  /* ─── render ─── */
  return (
    <form
      onSubmit={handleSubmit}
      className={cn("flex flex-col gap-6", className)}
      autoComplete="off"
      {...props}
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Login to your account</h1>
        <p className="text-muted-foreground text-sm text-balance">
          Enter your username or email below
        </p>
      </div>

      <div className="grid gap-6">
        {/* Email */}
        <div className="grid gap-3">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="text"
            inputMode="email"
            autoComplete="nope"
            placeholder="name@example.com"
            required
            className="bg-white text-black dark:bg-white dark:text-black"
          />
        </div>

        {/* Password */}
        <div className="grid gap-3">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPw ? "text" : "password"}
              autoComplete="nope"
              required
              placeholder="********"
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
          {/* prettier “Forgot password?” link */}
          <div className="flex justify-end">
            <a
              href="/forgot-password"
              className="text-xs text-gray-500 hover:text-blue-600 hover:underline transition-colors"
            >
              Forgot password?
            </a>
          </div>
        </div>

        {/* Login button */}
        <Button type="submit" className="w-full">
          Login
        </Button>

        {/* Inline labeled separator */}
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <div className="h-px flex-1 bg-muted-foreground/20" />
          Don&apos;t have an account?
          <div className="h-px flex-1 bg-muted-foreground/20" />
        </div>

        {/* Sign‑up button (same style as Login) */}
        <Button
          type="button"
          className="w-full"
          onClick={() => router.push("/signup")}
        >
          Sign up
        </Button>
      </div>
    </form>
  );
}
