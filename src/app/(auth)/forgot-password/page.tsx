// src/app/(auth)/forgot-password/page.tsx
import { Suspense } from "react";
import ForgotPasswordClient from "./forgot-password-client"; // ← new file

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordClient />
    </Suspense>
  );
}
