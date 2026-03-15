import { redirect } from "next/navigation";

import { LoginScreen } from "@/components/login-screen";
import { readSessionFromCookies } from "@/lib/auth/session";

export default async function LoginPage() {
  const session = await readSessionFromCookies();

  if (session) {
    redirect("/dashboard");
  }

  return <LoginScreen />;
}
