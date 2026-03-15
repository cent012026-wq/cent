import { isAfter } from "date-fns";

import type { RegistrarCostoResult, RegistrarVentaResult, Usuario } from "@/lib/domain/types";
import { publishDomainEvent } from "@/lib/events/bus";
import { logger } from "@/lib/logger";
import { evaluateAlertsForNegocio } from "@/lib/services/alerts";
import { computeMissingFields, mergePendingWithUserReply } from "@/lib/services/context";
import {
  clearConversationContext,
  findNegocioById,
  getActiveConversationContext,
  insertTransaction,
  listAtributosObligatorios,
  upsertConversationContext,
} from "@/lib/services/data-access";
import { dispatchRealtimeNotifications } from "@/lib/services/notifications";

function isNegocioFrozen(plan: string, trialExpiresAt: string | null): boolean {
  if (plan === "frozen") {
    return true;
  }

  if (!trialExpiresAt) {
    return false;
  }

  return isAfter(new Date(), new Date(trialExpiresAt));
}

function buildBaseExtracted(result: RegistrarVentaResult | RegistrarCostoResult): Record<string, unknown> {
  return {
    concepto: result.concepto,
    monto: result.monto,
    ...(result.intent === "registrar_venta" ? { cantidad: result.cantidad ?? 1 } : {}),
    ...result.atributos,
  };
}

function toPrimitiveAttributeMap(source: Record<string, unknown>): Record<string, string | number | boolean> {
  const entries: Array<[string, string | number | boolean]> = [];
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      entries.push([key, value]);
    }
  }
  return Object.fromEntries(entries);
}

export async function processTransactionIntent(input: {
  user: Usuario;
  result: RegistrarVentaResult | RegistrarCostoResult;
  rawText: string;
  messageId: string;
  reply: (text: string) => Promise<void>;
  comprobanteUrl?: string;
}): Promise<void> {
  const negocio = await findNegocioById(input.user.negocio_id);
  if (!negocio) {
    await input.reply("No pude encontrar la configuración del negocio. Intenta de nuevo más tarde.");
    return;
  }

  if (isNegocioFrozen(negocio.plan, negocio.trial_expires_at)) {
    await input.reply(
      "Tu cuenta está congelada por expiración del periodo de prueba. Ingresa al panel web para activar un plan.",
    );
    return;
  }

  if (input.result.intent === "registrar_costo" && input.user.rol === "vendedor" && !input.user.puede_registrar_costos) {
    await input.reply("No tienes permiso para registrar costos. Pide al dueño habilitarlo en el panel web.");
    return;
  }

  const requiredAttributes = await listAtributosObligatorios(input.user.negocio_id);
  const extracted = buildBaseExtracted(input.result);

  const context = await getActiveConversationContext(input.user.id);
  let mergedData = extracted;
  let missing: string[] = [];

  if (context && context.intent_pendiente === input.result.intent) {
    const pending = (context.datos_parciales ?? {}) as {
      values?: Record<string, unknown>;
      missing_fields?: string[];
    };

    const merged = mergePendingWithUserReply({
      pendingData: {
        ...(pending.values ?? {}),
        ...extracted,
      },
      missingFields: pending.missing_fields ?? [],
      userReply: input.rawText,
    });

    mergedData = merged.merged;
    missing = merged.missingFields;
  } else {
    missing = computeMissingFields({
      requiredAttributes,
      extracted,
    });
  }

  if (missing.length > 0) {
    await upsertConversationContext({
      usuarioId: input.user.id,
      intentPendiente: input.result.intent,
      datosParciales: {
        values: mergedData,
        missing_fields: missing,
      },
      mensajes: [
        {
          rol: "user",
          contenido: input.rawText,
          timestamp: new Date().toISOString(),
        },
      ],
    });

    await input.reply(`Me falta un dato obligatorio: ${missing[0]}. ¿Me lo compartes?`);
    return;
  }

  const concepto = String(mergedData.concepto ?? "").trim();
  const monto = Number(mergedData.monto ?? 0);
  const cantidad = Number(mergedData.cantidad ?? 1);

  if (!concepto || !Number.isFinite(monto) || monto <= 0) {
    await input.reply("No pude validar concepto y monto. Intenta de nuevo con más detalle.");
    return;
  }

  const details = { ...mergedData };
  delete details.concepto;
  delete details.monto;
  delete details.cantidad;

  const transaction = await insertTransaction({
    negocioId: input.user.negocio_id,
    usuarioId: input.user.id,
    tipo: input.result.intent === "registrar_venta" ? "venta" : "costo",
    concepto,
    monto,
    cantidad: input.result.intent === "registrar_venta" ? cantidad : 1,
    detalles: details,
    comprobanteUrl: input.comprobanteUrl,
    mensajeOriginal: input.rawText,
    messageId: input.messageId,
  });

  await clearConversationContext(input.user.id);
  publishDomainEvent({
    type: "transaction.created",
    payload: {
      transactionId: transaction.id,
      negocioId: input.user.negocio_id,
    },
  });

  await input.reply(
    input.result.intent === "registrar_venta"
      ? `Registrado: ${cantidad} x ${concepto} = $${(monto * cantidad).toLocaleString("es-CO")}.`
      : `Costo registrado: ${concepto} por $${monto.toLocaleString("es-CO")}.`,
  );

  await evaluateAlertsForNegocio(input.user.negocio_id);
  await dispatchRealtimeNotifications({
    negocioId: input.user.negocio_id,
    tipo: input.result.intent === "registrar_venta" ? "venta" : "costo",
    monto,
    cantidad,
    concepto,
    vendedorNombre: input.user.nombre ?? undefined,
  });

  publishDomainEvent({
    type: "alert.evaluate",
    payload: {
      negocioId: input.user.negocio_id,
      transactionId: transaction.id,
    },
  });

  publishDomainEvent({
    type: "notification.dispatch",
    payload: {
      negocioId: input.user.negocio_id,
      tipo: input.result.intent === "registrar_venta" ? "venta_realtime" : "costo_realtime",
    },
  });
}

export async function handlePendingOnlyReply(input: {
  user: Usuario;
  rawText: string;
  messageId: string;
  reply: (text: string) => Promise<void>;
}): Promise<boolean> {
  const context = await getActiveConversationContext(input.user.id);
  if (!context || !context.intent_pendiente) {
    return false;
  }

  const pending = (context.datos_parciales ?? {}) as {
    values?: Record<string, unknown>;
    missing_fields?: string[];
  };

  const merged = mergePendingWithUserReply({
    pendingData: pending.values ?? {},
    missingFields: pending.missing_fields ?? [],
    userReply: input.rawText,
  });

  if (merged.missingFields.length > 0) {
    await upsertConversationContext({
      usuarioId: input.user.id,
      intentPendiente: context.intent_pendiente,
      datosParciales: {
        values: merged.merged,
        missing_fields: merged.missingFields,
      },
      mensajes: [
        ...(context.mensajes ?? []),
        {
          rol: "user",
          contenido: input.rawText,
          timestamp: new Date().toISOString(),
        },
      ],
    });

    await input.reply(`Gracias. Me falta: ${merged.missingFields[0]}.`);
    return true;
  }

  logger.info("Pending context completed, recreating synthetic result", {
    usuarioId: input.user.id,
    intent: context.intent_pendiente,
  });

  const syntheticResult: RegistrarVentaResult | RegistrarCostoResult =
    context.intent_pendiente === "registrar_venta"
      ? {
          intent: "registrar_venta",
          confianza: 1,
          datos_faltantes: [],
          concepto: String(merged.merged.concepto ?? ""),
          monto: Number(merged.merged.monto ?? 0),
          cantidad: Number(merged.merged.cantidad ?? 1),
          atributos: toPrimitiveAttributeMap(
            Object.fromEntries(
              Object.entries(merged.merged).filter(
                ([key]) => !["concepto", "monto", "cantidad"].includes(key),
              ),
            ),
          ),
        }
      : {
          intent: "registrar_costo",
          confianza: 1,
          datos_faltantes: [],
          concepto: String(merged.merged.concepto ?? ""),
          monto: Number(merged.merged.monto ?? 0),
          atributos: toPrimitiveAttributeMap(
            Object.fromEntries(
              Object.entries(merged.merged).filter(([key]) => !["concepto", "monto"].includes(key)),
            ),
          ),
        };

  await processTransactionIntent({
    user: input.user,
    result: syntheticResult,
    rawText: input.rawText,
    messageId: input.messageId,
    reply: input.reply,
  });

  return true;
}
