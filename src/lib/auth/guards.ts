import { readSessionFromCookies } from "@/lib/auth/session";

export class AuthError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "AuthError";
  }
}

export async function requireSession(): Promise<{
  usuarioId: string;
  negocioId: string;
  rol: "dueno" | "vendedor";
  telefono: string;
}> {
  const session = await readSessionFromCookies();

  if (!session) {
    throw new AuthError("No active session");
  }

  return session;
}

export async function requireOwnerSession(): Promise<{
  usuarioId: string;
  negocioId: string;
  rol: "dueno";
  telefono: string;
}> {
  const session = await requireSession();

  if (session.rol !== "dueno") {
    throw new AuthError("Owner role required");
  }

  return {
    ...session,
    rol: "dueno",
  };
}
