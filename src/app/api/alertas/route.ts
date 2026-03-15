import { NextResponse } from "next/server";
import { z } from "zod";

import { AuthError, requireOwnerSession } from "@/lib/auth/guards";
import { createAlerta } from "@/lib/services/data-access";

const bodySchema = z.object({
  nombre: z.string().min(3),
  condicion: z.object({
    campo: z.enum(["monto", "cantidad"]),
    operador: z.enum([">=", ">", "<=", "<", "="]),
    valor: z.number().optional(),
    acumulador: z.literal("SUM"),
    filtros: z
      .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
      .optional(),
  }),
  objetivo_numerico: z.number().positive().optional(),
});

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const session = await requireOwnerSession();
    const payload = await request.json();
    const parsed = bodySchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const result = await createAlerta({
      negocioId: session.negocioId,
      nombre: parsed.data.nombre,
      condicion: parsed.data.condicion,
      objetivoNumerico: parsed.data.objetivo_numerico,
    });

    return NextResponse.json({ ok: true, id: result.id });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
