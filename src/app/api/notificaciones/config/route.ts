import { NextResponse } from "next/server";
import { z } from "zod";

import { AuthError, requireOwnerSession } from "@/lib/auth/guards";
import { upsertNotificacionConfig } from "@/lib/services/data-access";

const bodySchema = z.object({
  tipo: z.enum([
    "venta_realtime",
    "costo_realtime",
    "resumen_diario",
    "resumen_semanal",
    "resumen_mensual",
  ]),
  activa: z.boolean(),
  hora_envio: z.string().optional(),
  filtros: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const session = await requireOwnerSession();
    const payload = await request.json();
    const parsed = bodySchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const result = await upsertNotificacionConfig({
      negocioId: session.negocioId,
      tipo: parsed.data.tipo,
      activa: parsed.data.activa,
      horaEnvio: parsed.data.hora_envio,
      filtros: parsed.data.filtros ?? null,
    });

    return NextResponse.json({ ok: true, id: result.id });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
