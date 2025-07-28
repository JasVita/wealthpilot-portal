"use client";

import { SignupForm } from "@/components/auth/signup-form";
import Image from "next/image";
import { usePathname } from "next/navigation";

export default function Page() {
  const pathname = usePathname();          // ✅ now allowed
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* -------- Left panel -------- */}
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="#" className="flex items-center gap-2 font-medium">
            <div className="flex size-16 items-center justify-center rounded-md">
              <Image src="/WP_logo.svg" alt="Logo" width={40} height={40} />
            </div>
            Wealth Pilot
          </a>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <SignupForm key={pathname} />
          </div>
        </div>
      </div>

      {/* -------- Right cover image -------- */}
      <div className="bg-muted relative hidden lg:block">
        <img
          src="/login_cover.png"
          alt="Image"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  );
}
