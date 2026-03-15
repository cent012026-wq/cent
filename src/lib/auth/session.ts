import type { JWTPayload } from "jose";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import type { Rol } from "@/lib/domain/types";

const SESSION_COOKIE = "cent_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30;

export interface SessionClaims extends JWTPayload {
  usuarioId: string;
  negocioId: string;
  telefono: string;
  rol: Rol;
}

function secretKey(): Uint8Array {
  return new TextEncoder().encode(env.SUPABASE_JWT_SECRET);
}

export async function createSessionToken(claims: SessionClaims): Promise<string> {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(secretKey());
}

export async function readSessionFromCookies(): Promise<SessionClaims | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  try {
    const verified = await jwtVerify<SessionClaims>(token, secretKey());
    return verified.payload;
  } catch {
    return null;
  }
}

export async function attachSessionCookie(
  response: NextResponse,
  claims: SessionClaims,
): Promise<NextResponse> {
  const token = await createSessionToken(claims);

  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });

  return response;
}

export async function clearSessionCookie(response: NextResponse): Promise<NextResponse> {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    path: "/",
    maxAge: 0,
  });

  return response;
}
