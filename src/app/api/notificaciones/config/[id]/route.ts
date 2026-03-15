import { NextResponse } from "next/server";
import { z } from "zod";

import { AuthError, requireOwnerSession } from "@/lib/auth/guards";
import { patchNotificacionConfig } from "@/lib/services/data-access";

const bodySchema = z.object({
  activa: z.boolean().optional(),
  hora_envio: z.string().nullable().optional(),
  filtros: z.record(z.string(), z.unknown()).nullable().optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await requireOwnerSession();
    const { id } = await context.params;
    const payload = await request.json();
    const parsed = bodySchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    await patchNotificacionConfig({
      id,
      negocioId: session.negocioId,
      activa: parsed.data.activa,
      horaEnvio: parsed.data.hora_envio,
      filtros: parsed.data.filtros,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
