import { NextResponse } from "next/server";
import { z } from "zod";

import { AuthError, requireOwnerSession } from "@/lib/auth/guards";
import { deleteTeamUser, updateTeamUser } from "@/lib/services/data-access";
import { resendSellerOtp, verifySellerOtp } from "@/lib/services/team-invitations";

const patchSchema = z
  .object({
    activo: z.boolean().optional(),
    puedeRegistrarCostos: z.boolean().optional(),
  })
  .refine((value) => value.activo !== undefined || value.puedeRegistrarCostos !== undefined, {
    message: "No update fields provided",
  });

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("resend_otp"),
  }),
  z.object({
    action: z.literal("verify_otp"),
    codigo: z.string().trim().regex(/^\d{6}$/),
  }),
]);

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await requireOwnerSession();
    const { id } = await context.params;
    const payload = await request.json();

    const actionParsed = actionSchema.safeParse(payload);
    if (actionParsed.success) {
      if (actionParsed.data.action === "resend_otp") {
        await resendSellerOtp({
          negocioId: session.negocioId,
          userId: id,
        });

        return NextResponse.json({ ok: true, message: "OTP reenviado al vendedor." });
      }

      await verifySellerOtp({
        negocioId: session.negocioId,
        userId: id,
        code: actionParsed.data.codigo,
      });

      return NextResponse.json({ ok: true, message: "Vendedor verificado." });
    }

    const parsed = patchSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

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

    if (error instanceof Error) {
      if (
        error.message === "El código no coincide." ||
        error.message === "El OTP expiró. Reenvía uno nuevo." ||
        error.message === "No hay un OTP pendiente para este vendedor." ||
        error.message === "El vendedor superó el máximo de intentos. Reenvía un nuevo OTP." ||
        error.message === "Ese vendedor ya está verificado."
      ) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }

      if (error.message.startsWith("Failed to send WhatsApp OTP template:")) {
        return NextResponse.json({ error: "No pudimos reenviar el OTP al vendedor." }, { status: 502 });
      }
    }

    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await requireOwnerSession();
    const { id } = await context.params;

    await deleteTeamUser({
      negocioId: session.negocioId,
      userId: id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (error instanceof Error && error.message === "Team user not found") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error instanceof Error && error.message === "Only seller records can be deleted from this action") {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    if ((error as { code?: string }).code === "23503") {
      return NextResponse.json(
        { error: "No se puede eliminar este vendedor porque ya tiene historial registrado. Puedes pausarlo en su lugar." },
        { status: 409 },
      );
    }

    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
