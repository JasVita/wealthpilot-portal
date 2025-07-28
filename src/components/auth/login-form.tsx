"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/stores/user-store";
import { useClientStore } from "@/stores/clients-store";

export function LoginForm({ className, ...props }: React.ComponentProps<"form">) {
  const router = useRouter();
  const { setUsername, setID } = useUserStore();
  const { loadClients } = useClientStore();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    /* The value can be either a plain username ("turoid") or a normal email */
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const res = await fetch("/api/manual-login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
        headers: { "Content-Type": "application/json" },
      });

      const isJson = res.headers.get("content-type")?.includes("application/json");
      const data   = isJson ? await res.json() : { success: false, message: "Unexpected server response." };

      if (!data.success || !data.user) {
        throw new Error(data.message || "Login failed");
      }

      setUsername(data.user.email);
      setID(data.user.id);

      try {
        await loadClients();
      } catch (err) {
        console.error("[login-form] loadClients error", err);
        toast.error("Could not load client data, but login succeeded.");
      }

      toast.success("Logged in successfully 🎉");
      router.push("/clients-dashboard");
    } catch (err: any) {
      toast.error(err.message || "Login failed");
      console.error("[login-form] submit error:", err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Login to your account</h1>
        <p className="text-muted-foreground text-sm text-balance">
          Enter your username or email below
        </p>
      </div>

      <div className="grid gap-6">
        <div className="grid gap-3">
          {/*  ⚠️  type changed from "email" ➜ "text" so HTML5 validation no longer requires "@" */}
          <Label htmlFor="email">Username / Email</Label>
          <Input
            id="email"
            name="email"
            type="text"
            inputMode="email"       /* still shows the @ keyboard on mobile */
            autoComplete="username"
            placeholder="turoid  ‑or‑  name@example.com"
            required
          />
        </div>

        <div className="grid gap-3">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            placeholder="********"
            autoComplete="current-password"
          />
        </div>

        <Button type="submit" className="w-full">Login</Button>

        <p className="text-center text-sm">
          Don't have an account?{" "}
          <a href="/signup" className="text-primary underline-offset-4 hover:underline">Sign up</a>
        </p>
      </div>
    </form>
  );
}
