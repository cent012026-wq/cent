import { redirect } from "next/navigation";

import { readSessionFromCookies } from "@/lib/auth/session";

export async function requireOwnerPageSession(): Promise<{
  usuarioId: string;
  negocioId: string;
  telefono: string;
}> {
  const session = await readSessionFromCookies();

  if (!session || session.rol !== "dueno") {
    redirect("/login");
  }

  return {
    usuarioId: session.usuarioId,
    negocioId: session.negocioId,
    telefono: session.telefono,
  };
}
