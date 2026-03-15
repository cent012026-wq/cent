import { NextResponse } from "next/server";
import { z } from "zod";

import { AuthError, requireOwnerSession } from "@/lib/auth/guards";
import { updateNegocioConfigAgente } from "@/lib/services/data-access";

const bodySchema = z.object({
  nombre: z.string().trim().min(2).max(50),
  tono: z.string().trim().min(2).max(50),
  jerga: z.string().trim().min(2).max(50),
});

export async function PATCH(request: Request): Promise<NextResponse> {
  try {
    const session = await requireOwnerSession();
    const payload = await request.json();
    const parsed = bodySchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    await updateNegocioConfigAgente({
      negocioId: session.negocioId,
      config: {
        nombre: parsed.data.nombre,
        tono: parsed.data.tono,
        jerga: parsed.data.jerga,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
