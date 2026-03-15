import { NextResponse } from "next/server";

import { AuthError, requireSession } from "@/lib/auth/guards";
import { getMetricsSummary } from "@/lib/services/metrics";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);

    const from = searchParams.get("from") ?? undefined;
    const to = searchParams.get("to") ?? undefined;

    const summary = await getMetricsSummary({
      negocioId: session.negocioId,
      rol: session.rol,
      usuarioId: session.usuarioId,
      from,
      to,
    });

    return NextResponse.json(summary);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
