import { NextResponse } from "next/server";
import { z } from "zod";

import { AuthError, requireOwnerSession } from "@/lib/auth/guards";
import { updateTeamUser } from "@/lib/services/data-access";

const patchSchema = z
  .object({
    activo: z.boolean().optional(),
    puedeRegistrarCostos: z.boolean().optional(),
  })
  .refine((value) => value.activo !== undefined || value.puedeRegistrarCostos !== undefined, {
    message: "No update fields provided",
  });

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await requireOwnerSession();
    const payload = await request.json();
    const parsed = patchSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { id } = await context.params;

    await updateTeamUser({
      negocioId: session.negocioId,
      userId: id,
      activo: parsed.data.activo,
      puedeRegistrarCostos: parsed.data.puedeRegistrarCostos,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (error instanceof Error && error.message === "Only seller records can be updated from this action") {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    if (error instanceof Error && error.message === "Team user not found") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
