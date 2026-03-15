import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { AuthError, requireSession } from "@/lib/auth/guards";
import { evaluateAlertsForNegocio } from "@/lib/services/alerts";
import {
  findNegocioById,
  findUserById,
  insertTransaction,
  listTransactions,
} from "@/lib/services/data-access";
import { dispatchRealtimeNotifications } from "@/lib/services/notifications";

const createSchema = z.object({
  tipo: z.enum(["venta", "costo"]),
  concepto: z.string().min(1),
  monto: z.number().positive(),
  cantidad: z.number().int().positive().optional(),
  detalles: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);

    const rows = await listTransactions({
      negocioId: session.negocioId,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      tipo: (searchParams.get("tipo") as "venta" | "costo" | null) ?? undefined,
      usuarioId: session.rol === "vendedor" ? session.usuarioId : searchParams.get("usuario_id") ?? undefined,
    });

    return NextResponse.json({ data: rows });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const session = await requireSession();
    const payload = await request.json();
    const parsed = createSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const body = parsed.data;
    const user = await findUserById(session.usuarioId);
    if (!user || !user.activo) {
      return NextResponse.json({ error: "Usuario no autorizado" }, { status: 403 });
    }

    if (body.tipo === "costo" && user.rol === "vendedor" && !user.puede_registrar_costos) {
      return NextResponse.json({ error: "No tienes permiso para registrar costos" }, { status: 403 });
    }

    const negocio = await findNegocioById(session.negocioId);
    if (!negocio) {
      return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
    }

    if (negocio.plan === "frozen") {
      return NextResponse.json({ error: "Cuenta congelada. Debes activar un plan." }, { status: 402 });
    }

    const tx = await insertTransaction({
      negocioId: session.negocioId,
      usuarioId: session.usuarioId,
      tipo: body.tipo,
      concepto: body.concepto,
      monto: body.monto,
      cantidad: body.cantidad ?? 1,
      detalles: body.detalles ?? {},
      mensajeOriginal: JSON.stringify(body),
      messageId: `web-${randomUUID()}`,
    });

    await evaluateAlertsForNegocio(session.negocioId);
    await dispatchRealtimeNotifications({
      negocioId: session.negocioId,
      tipo: body.tipo,
      monto: body.monto,
      cantidad: body.cantidad ?? 1,
      concepto: body.concepto,
      vendedorNombre: user.nombre ?? undefined,
    });

    return NextResponse.json({ ok: true, id: tx.id }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
