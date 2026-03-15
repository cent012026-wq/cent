import { NextResponse } from "next/server";

import { AuthError, requireSession } from "@/lib/auth/guards";
import { listTransactions } from "@/lib/services/data-access";

function escapeCsv(value: unknown): string {
  const raw = value == null ? "" : String(value);
  if (raw.includes(",") || raw.includes('"') || raw.includes("\n")) {
    return `"${raw.replaceAll('"', '""')}"`;
  }

  return raw;
}

export async function GET(): Promise<NextResponse> {
  try {
    const session = await requireSession();
    const rows = (await listTransactions({
      negocioId: session.negocioId,
      usuarioId: session.rol === "vendedor" ? session.usuarioId : undefined,
    })) as Array<{
      created_at: string;
      tipo: string;
      concepto: string;
      cantidad?: number;
      monto: number;
      detalles?: Record<string, unknown>;
    }>;

    const header = ["fecha", "tipo", "concepto", "cantidad", "monto", "detalles"];
    const lines = rows.map((row) =>
      [
        new Date(row.created_at).toISOString(),
        row.tipo,
        row.concepto,
        row.cantidad ?? 1,
        row.monto,
        row.detalles ? JSON.stringify(row.detalles) : "",
      ]
        .map(escapeCsv)
        .join(","),
    );

    const csv = [header.join(","), ...lines].join("\n");

    return new NextResponse(`\uFEFF${csv}`, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="cent-transacciones.csv"',
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
