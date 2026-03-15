import { NextResponse } from "next/server";
import { z } from "zod";

import { AuthError, requireOwnerSession } from "@/lib/auth/guards";
import { createTeamUser } from "@/lib/services/data-access";
import { normalizePhone } from "@/lib/utils/parsing";

const createSchema = z.object({
  nombre: z.string().trim().min(2).max(80),
  telefono: z.string().trim().min(8),
  puedeRegistrarCostos: z.boolean().default(false),
});

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const session = await requireOwnerSession();
    const payload = await request.json();
    const parsed = createSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const user = await createTeamUser({
      negocioId: session.negocioId,
      nombre: parsed.data.nombre,
      telefono: normalizePhone(parsed.data.telefono),
      puedeRegistrarCostos: parsed.data.puedeRegistrarCostos,
    });

    return NextResponse.json({ ok: true, data: user }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if ((error as { code?: string }).code === "23505") {
      return NextResponse.json(
        { error: "Ese número ya está asociado a otra cuenta dentro de cent." },
        { status: 409 },
      );
    }

    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
