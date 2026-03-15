import { NextResponse } from "next/server";
import { z } from "zod";

import { AuthError, requireOwnerSession } from "@/lib/auth/guards";
import { updateAlertaById } from "@/lib/services/data-access";

const bodySchema = z.object({
  nombre: z.string().min(3).optional(),
  activa: z.boolean().optional(),
  condicion: z
    .object({
      campo: z.enum(["monto", "cantidad"]),
      operador: z.enum([">=", ">", "<=", "<", "="]),
      valor: z.number().optional(),
      acumulador: z.literal("SUM"),
      filtros: z
        .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
        .optional(),
    })
    .optional(),
  objetivo_numerico: z.number().positive().optional(),
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

    await updateAlertaById({
      alertaId: id,
      negocioId: session.negocioId,
      nombre: parsed.data.nombre,
      activa: parsed.data.activa,
      condicion: parsed.data.condicion,
      objetivoNumerico: parsed.data.objetivo_numerico,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
