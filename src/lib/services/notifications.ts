import { differenceInCalendarDays, format } from "date-fns";

import type { NotificacionTipo } from "@/lib/domain/types";
import { logger } from "@/lib/logger";
import { getMetricsSummary } from "@/lib/services/metrics";
import {
  listAllNegocios,
  listDueOwnersByNegocio,
  listNotificacionConfig,
  patchNotificacionConfig,
  freezeNegocio,
} from "@/lib/services/data-access";
import { sendWhatsAppTextMessage } from "@/lib/whatsapp/meta";

function shouldSendRealtime(
  tipo: NotificacionTipo,
  tx: { tipo: "venta" | "costo"; monto: number },
  config: { activa: boolean; filtros: Record<string, unknown> | null },
): boolean {
  if (!config.activa) {
    return false;
  }

  if (tipo === "venta_realtime" && tx.tipo !== "venta") {
    return false;
  }

  if (tipo === "costo_realtime" && tx.tipo !== "costo") {
    return false;
  }

  const min = Number(config.filtros?.monto_minimo ?? 0);
  return tx.monto >= min;
}

export async function dispatchRealtimeNotifications(input: {
  negocioId: string;
  tipo: "venta" | "costo";
  monto: number;
  cantidad: number;
  concepto: string;
  vendedorNombre?: string;
}): Promise<void> {
  const owners = await listDueOwnersByNegocio(input.negocioId);
  const configs = await listNotificacionConfig(input.negocioId);

  for (const config of configs) {
    if (config.tipo !== "venta_realtime" && config.tipo !== "costo_realtime") {
      continue;
    }

    const allowed = shouldSendRealtime(config.tipo, { tipo: input.tipo, monto: input.monto }, config);
    if (!allowed) {
      continue;
    }

    const body =
      input.tipo === "venta"
        ? `Nueva venta: ${input.cantidad} x ${input.concepto} por $${input.monto.toLocaleString("es-CO")}${
            input.vendedorNombre ? ` (${input.vendedorNombre})` : ""
          }.`
        : `Nuevo costo: ${input.concepto} por $${input.monto.toLocaleString("es-CO")}.`;

    for (const owner of owners) {
      await sendWhatsAppTextMessage(owner.telefono, body);
    }
  }
}

function hourMatches(horaEnvio: string | null): boolean {
  if (!horaEnvio) {
    return false;
  }

  const now = new Date();
  const hhmm = format(now, "HH:mm");
  return hhmm === horaEnvio.slice(0, 5);
}

function shouldRunByFrequency(tipo: string, ultima: string | null): boolean {
  if (!ultima) {
    return true;
  }

  const now = new Date();
  const last = new Date(ultima);

  if (tipo === "resumen_diario") {
    return differenceInCalendarDays(now, last) >= 1;
  }

  if (tipo === "resumen_semanal") {
    return differenceInCalendarDays(now, last) >= 7;
  }

  if (tipo === "resumen_mensual") {
    return differenceInCalendarDays(now, last) >= 30;
  }

  return false;
}

export async function runScheduledNotifications(): Promise<void> {
  const now = new Date();
  const negocios = await listAllNegocios();

  for (const negocio of negocios) {
    const owners = await listDueOwnersByNegocio(negocio.id);

    if (negocio.plan === "trial" && negocio.trial_expires_at) {
      const daysLeft = differenceInCalendarDays(new Date(negocio.trial_expires_at), now);

      if (daysLeft === 7 || daysLeft === 3) {
        for (const owner of owners) {
          await sendWhatsAppTextMessage(
            owner.telefono,
            `Tu prueba gratis de cent vence en ${daysLeft} días. Ingresa al panel para elegir plan y continuar operando.`,
          );
        }
      }

      if (daysLeft < 0) {
        await freezeNegocio(negocio.id);
        for (const owner of owners) {
          await sendWhatsAppTextMessage(
            owner.telefono,
            "Tu prueba gratis terminó y la cuenta fue congelada (solo lectura). Elige un plan para reactivar transacciones.",
          );
        }
      }
    }

    if (negocio.plan === "frozen") {
      continue;
    }

    const configs = await listNotificacionConfig(negocio.id);

    for (const config of configs) {
      if (!["resumen_diario", "resumen_semanal", "resumen_mensual"].includes(config.tipo)) {
        continue;
      }

      if (!config.activa || !hourMatches(config.hora_envio)) {
        continue;
      }

      if (!shouldRunByFrequency(config.tipo, config.ultima_ejecucion)) {
        continue;
      }

      const summary = await getMetricsSummary({
        negocioId: negocio.id,
        rol: "dueno",
      });

      const titleByType: Record<string, string> = {
        resumen_diario: "Resumen diario",
        resumen_semanal: "Resumen semanal",
        resumen_mensual: "Resumen mensual",
      };

      const message = `${titleByType[config.tipo]}: ventas $${summary.totalVentas.toLocaleString(
        "es-CO",
      )}, costos $${summary.totalCostos.toLocaleString("es-CO")}, margen $${summary.margen.toLocaleString(
        "es-CO",
      )}.`;

      for (const owner of owners) {
        await sendWhatsAppTextMessage(owner.telefono, message);
      }

      await patchNotificacionConfig({
        id: config.id,
        negocioId: negocio.id,
        ultimaEjecucion: now.toISOString(),
      });
    }
  }

  logger.info("Scheduled notifications run completed");
}
