import type { Alerta, AlertaCondicion } from "@/lib/domain/types";
import { logger } from "@/lib/logger";
import {
  listAlertasActivas,
  listDueOwnersByNegocio,
  listTransactions,
  updateAlertaProgress,
} from "@/lib/services/data-access";
import { sendWhatsAppTextMessage } from "@/lib/whatsapp/meta";

function compare(operator: string, left: number, right: number): boolean {
  switch (operator) {
    case ">=":
      return left >= right;
    case ">":
      return left > right;
    case "<=":
      return left <= right;
    case "<":
      return left < right;
    case "=":
      return left === right;
    default:
      return false;
  }
}

function matchesFilters(
  condition: AlertaCondicion,
  transaction: {
    concepto: string;
    detalles: Record<string, string | number | boolean>;
  },
): boolean {
  if (!condition.filtros) {
    return true;
  }

  for (const [key, value] of Object.entries(condition.filtros)) {
    if (key === "concepto") {
      if (transaction.concepto.toLowerCase() !== String(value).toLowerCase()) {
        return false;
      }
      continue;
    }

    if (transaction.detalles[key] !== value) {
      return false;
    }
  }

  return true;
}

async function evaluateAlert(alerta: Alerta): Promise<{ progreso: number; fulfilled: boolean }> {
  const condition = alerta.condicion;
  const transactions = await listTransactions({ negocioId: alerta.negocio_id });

  let aggregate = 0;
  for (const tx of transactions) {
    const row = tx as {
      tipo: "venta" | "costo";
      monto: number;
      cantidad: number;
      concepto: string;
      detalles: Record<string, string | number | boolean>;
    };

    if (!matchesFilters(condition, { concepto: row.concepto, detalles: row.detalles ?? {} })) {
      continue;
    }

    aggregate += condition.campo === "monto" ? Number(row.monto) : Number(row.cantidad ?? 1);
  }

  const target = alerta.objetivo_numerico ?? condition.valor ?? 0;
  const fulfilled = compare(condition.operador, aggregate, Number(target));

  return {
    progreso: aggregate,
    fulfilled,
  };
}

export async function evaluateAlertsForNegocio(negocioId: string): Promise<void> {
  const alerts = await listAlertasActivas(negocioId);
  const owners = await listDueOwnersByNegocio(negocioId);

  for (const alert of alerts) {
    try {
      const result = await evaluateAlert(alert);
      await updateAlertaProgress({
        alertaId: alert.id,
        progresoActual: result.progreso,
        notificada: result.fulfilled ? true : alert.notificada,
      });

      if (result.fulfilled && !alert.notificada) {
        for (const owner of owners) {
          await sendWhatsAppTextMessage(
            owner.telefono,
            `Meta alcanzada: "${alert.nombre}". Progreso actual: ${result.progreso}.`,
          );
        }
      }
    } catch (error) {
      logger.error("Failed evaluating alert", {
        alertId: alert.id,
        error: error instanceof Error ? error.message : "unknown_error",
      });
    }
  }
}
