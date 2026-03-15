import { NextResponse } from "next/server";
import { z } from "zod";

import { attachSessionCookie } from "@/lib/auth/session";
import { verifyOtpCode } from "@/lib/services/auth-otp";
import { normalizePhone } from "@/lib/utils/parsing";

const requestSchema = z.object({
  telefono: z.string().min(8),
  codigo: z.string().length(6),
});

export async function POST(request: Request): Promise<NextResponse> {
  const json = await request.json();
  const parsed = requestSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await verifyOtpCode(normalizePhone(parsed.data.telefono), parsed.data.codigo);

  if (!result.ok || !result.user) {
    return NextResponse.json({ ok: false, reason: result.reason ?? "invalid" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, rol: result.user.rol });
  await attachSessionCookie(response, {
    usuarioId: result.user.id,
    negocioId: result.user.negocio_id,
    rol: result.user.rol,
    telefono: result.user.telefono,
  });

  return response;
}
