import { startOfDay, endOfDay } from "date-fns";

import { getAdminClient } from "@/lib/db/admin";
import type { Rol } from "@/lib/domain/types";

export interface MetricsSummary {
  totalVentas: number;
  totalCostos: number;
  margen: number;
  totalTransacciones: number;
  totalVentasCount: number;
  topVendedorId: string | null;
}

export async function getMetricsSummary(input: {
  negocioId: string;
  rol: Rol;
  usuarioId?: string;
  from?: string;
  to?: string;
}): Promise<MetricsSummary> {
  const from = input.from ?? startOfDay(new Date()).toISOString();
  const to = input.to ?? endOfDay(new Date()).toISOString();

  const supabase = getAdminClient();
  let query = supabase
    .from("transacciones")
    .select("id, usuario_id, tipo, monto")
    .eq("negocio_id", input.negocioId)
    .gte("created_at", from)
    .lte("created_at", to);

  if (input.rol === "vendedor" && input.usuarioId) {
    query = query.eq("usuario_id", input.usuarioId);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  const rows = (data as Array<{ id: string; usuario_id: string; tipo: "venta" | "costo"; monto: number }>) ?? [];
  let ventas = 0;
  let costos = 0;
  let ventasCount = 0;
  const vendorMap = new Map<string, number>();

  for (const tx of rows) {
    if (tx.tipo === "venta") {
      ventas += Number(tx.monto);
      ventasCount += 1;
      vendorMap.set(tx.usuario_id, (vendorMap.get(tx.usuario_id) ?? 0) + 1);
    } else {
      costos += Number(tx.monto);
    }
  }

  let topVendedorId: string | null = null;
  let maxCount = 0;
  for (const [userId, count] of vendorMap.entries()) {
    if (count > maxCount) {
      maxCount = count;
      topVendedorId = userId;
    }
  }

  return {
    totalVentas: ventas,
    totalCostos: costos,
    margen: ventas - costos,
    totalTransacciones: rows.length,
    totalVentasCount: ventasCount,
    topVendedorId,
  };
}
