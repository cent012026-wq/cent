import { classifyIntent, extractCosto, extractVenta } from "@/lib/ai/router";
import type { IntentType, WebhookMessage } from "@/lib/domain/types";
import { publishDomainEvent } from "@/lib/events/bus";
import { logger } from "@/lib/logger";
import { getMetricsSummary } from "@/lib/services/metrics";
import { runAudioOnboarding } from "@/lib/services/onboarding";
import {
  findUserByPhone,
  listAlertasActivas,
  registerInboundMessage,
  listAtributos,
} from "@/lib/services/data-access";
import { handlePendingOnlyReply, processTransactionIntent } from "@/lib/services/transactions";
import {
  downloadWhatsAppMedia,
  downloadWhatsAppMediaByUrl,
  sendWhatsAppTextMessage,
} from "@/lib/whatsapp/meta";
import { parseWebhookMessages } from "@/lib/whatsapp/webhook";
import { OpenAIProvider } from "@/lib/ai/openai-provider";
import { env } from "@/lib/env";

function mapIntentToReply(intent: IntentType): string {
  switch (intent) {
    case "ayuda":
      return "Puedes escribirme ventas, costos, métricas o estado de alertas. Ejemplo: Vendí 3 camisas a 25 mil.";
    case "saludo_general":
      return "Hola. Estoy listo para registrar ventas y gastos de tu negocio.";
    case "estado_alertas":
      return "Estoy revisando tus alertas activas.";
    default:
      return "No entendí del todo tu mensaje. ¿Puedes reformularlo?";
  }
}

async function transcribeAudioIfNeeded(message: WebhookMessage): Promise<string> {
  if (message.type !== "audio") {
    return message.text ?? "";
  }

  if (message.transcript) {
    return message.transcript;
  }

  const buffer = message.mediaUrl
    ? await downloadWhatsAppMediaByUrl(message.mediaUrl)
    : message.mediaId
      ? await downloadWhatsAppMedia(message.mediaId)
      : null;

  if (!buffer) {
    return message.text ?? "";
  }

  if (!env.STT_API_KEY && !env.OPENAI_API_KEY) {
    return "";
  }

  const provider = new OpenAIProvider();
  return provider.transcribeAudio(buffer);
}

async function replyTo(phone: string, text: string): Promise<void> {
  await sendWhatsAppTextMessage(phone, text);
}

async function handleUnknownUser(message: WebhookMessage): Promise<void> {
  if (message.type !== "audio") {
    await replyTo(
      message.from,
      "Bienvenido a cent. Para crear tu cuenta, envía un audio de 1 minuto contando qué vendes y qué datos quieres rastrear.",
    );
    return;
  }

  if (!message.mediaId && !message.mediaUrl && !message.transcript) {
    await replyTo(message.from, "No pude leer el audio. Intenta enviarlo nuevamente.");
    return;
  }

  const transcript = await (async () => {
    if (message.transcript) {
      return message.transcript;
    }

    const buffer = message.mediaUrl
      ? await downloadWhatsAppMediaByUrl(message.mediaUrl)
      : message.mediaId
        ? await downloadWhatsAppMedia(message.mediaId)
        : null;

    if (!buffer) {
      return "";
    }

    if (!env.STT_API_KEY && !env.OPENAI_API_KEY) {
      return "";
    }

    return new OpenAIProvider().transcribeAudio(buffer);
  })();

  if (!transcript) {
    await replyTo(
      message.from,
      "No pude transcribir tu audio. Reenvíalo o escríbeme la descripción del negocio en texto.",
    );
    return;
  }

  const onboarding = await runAudioOnboarding({
    telefono: message.from,
    transcript,
  });

  await replyTo(
    message.from,
    `Tu negocio ${onboarding.negocioNombre} quedó listo. Detecté nicho ${onboarding.nicho}. Campos configurados: ${onboarding.atributos.join(", ")}.`,
  );
}

async function handleMetricsIntent(input: {
  user: NonNullable<Awaited<ReturnType<typeof findUserByPhone>>>;
  from: string;
}): Promise<void> {
  const summary = await getMetricsSummary({
    negocioId: input.user.negocio_id,
    rol: input.user.rol,
    usuarioId: input.user.id,
  });

  await replyTo(
    input.from,
    `Hoy llevas ventas por $${summary.totalVentas.toLocaleString("es-CO")}, costos por $${summary.totalCostos.toLocaleString(
      "es-CO",
    )}, margen $${summary.margen.toLocaleString("es-CO")}.`,
  );
}

async function handleAlertStatusIntent(input: {
  user: NonNullable<Awaited<ReturnType<typeof findUserByPhone>>>;
  from: string;
}): Promise<void> {
  if (input.user.rol !== "dueno") {
    await replyTo(input.from, "Solo el dueño puede consultar alertas globales.");
    return;
  }

  const alertas = await listAlertasActivas(input.user.negocio_id);
  if (alertas.length === 0) {
    await replyTo(input.from, "No tienes alertas activas.");
    return;
  }

  const preview = alertas
    .slice(0, 3)
    .map((a) => `${a.nombre}: ${a.progreso_actual}`)
    .join(" | ");

  await replyTo(input.from, `Alertas activas: ${preview}`);
}

async function maybeHandleQuickCommands(input: {
  user: NonNullable<Awaited<ReturnType<typeof findUserByPhone>>>;
  text: string;
  from: string;
}): Promise<boolean> {
  const normalized = input.text.trim().toLowerCase();
  if (!["no", "para", "parar"].includes(normalized)) {
    return false;
  }

  await replyTo(
    input.from,
    "Listo. Si quieres, puedo desactivar notificaciones específicas desde el panel web en la sección Notificaciones.",
  );
  return true;
}

async function handleKnownUserMessage(message: WebhookMessage): Promise<void> {
  const user = await findUserByPhone(message.from);
  if (!user) {
    await handleUnknownUser(message);
    return;
  }

  if (!user.activo) {
    return;
  }

  const text = await transcribeAudioIfNeeded(message);

  if (!text) {
    await replyTo(message.from, "No pude procesar tu mensaje. Intenta nuevamente.");
    return;
  }

  if (await maybeHandleQuickCommands({ user, text, from: message.from })) {
    return;
  }

  const pendingHandled = await handlePendingOnlyReply({
    user,
    rawText: text,
    messageId: message.messageId,
    reply: async (body) => replyTo(message.from, body),
  });

  if (pendingHandled) {
    return;
  }

  const classified = await classifyIntent(text);
  publishDomainEvent({
    type: "intent.resolved",
    payload: {
      messageId: message.messageId,
      intent: classified.intent,
    },
  });

  if (classified.intent === "registrar_venta") {
    const extracted = await extractVenta(text);

    await processTransactionIntent({
      user,
      result: extracted,
      rawText: text,
      messageId: message.messageId,
      reply: async (body) => replyTo(message.from, body),
    });

    return;
  }

  if (classified.intent === "registrar_costo") {
    const extracted = await extractCosto(text);
    await processTransactionIntent({
      user,
      result: extracted,
      rawText: text,
      messageId: message.messageId,
      reply: async (body) => replyTo(message.from, body),
    });
    return;
  }

  if (classified.intent === "consultar_metricas") {
    await handleMetricsIntent({ user, from: message.from });
    return;
  }

  if (classified.intent === "estado_alertas") {
    await handleAlertStatusIntent({ user, from: message.from });
    return;
  }

  if (/agrega\s+el\s+campo|crear\s+campo|configurar\s+campo/i.test(text)) {
    await replyTo(
      message.from,
      "Esa configuración se hace desde el panel web. Ingresa con tu número y ve a Atributos.",
    );
    return;
  }

  await replyTo(message.from, mapIntentToReply(classified.intent));

  const attrs = await listAtributos(user.negocio_id);
  logger.debug("loaded_attributes_after_message", {
    negocioId: user.negocio_id,
    count: attrs.length,
  });
}

export async function processIncomingWhatsAppPayload(payload: unknown): Promise<void> {
  const messages = parseWebhookMessages(payload as Parameters<typeof parseWebhookMessages>[0]);

  for (const message of messages) {
    try {
      const inserted = await registerInboundMessage(message.messageId, message.from, message);
      if (!inserted) {
        continue;
      }

      publishDomainEvent({
        type: "message.received",
        payload: {
          messageId: message.messageId,
          phone: message.from,
        },
      });

      await handleKnownUserMessage(message);
    } catch (error) {
      logger.error("Error processing inbound WhatsApp message", {
        messageId: message.messageId,
        error: error instanceof Error ? error.message : "unknown_error",
      });
    }
  }
}
