import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginView } from "@/components/panel/login-view";

export const metadata: Metadata = {
  title: "Entrar no painel",
  robots: { index: false },
};

export default function LoginPage() {
  return (
    <Suspense>
      <LoginView />
    </Suspense>
  );
}
