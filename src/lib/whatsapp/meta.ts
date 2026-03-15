import { createHmac, timingSafeEqual } from "node:crypto";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { isSupabaseConfigured } from "@/lib/db/admin";
import { logOutboundMessage } from "@/lib/services/data-access";

function isKapsoProvider(): boolean {
  return env.WHATSAPP_PROVIDER === "kapso";
}

function graphApiUrl(path: string): string {
  if (isKapsoProvider()) {
    return `${env.KAPSO_BASE_URL}/meta/whatsapp/${env.WHATSAPP_API_VERSION}/${path}`;
  }

  return `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${path}`;
}

function normalizeSignature(signatureHeader: string): string {
  return signatureHeader.startsWith("sha256=") ? signatureHeader.slice(7) : signatureHeader;
}

function secureCompareHex(left: string, right: string): boolean {
  try {
    const leftBuffer = Buffer.from(left, "hex");
    const rightBuffer = Buffer.from(right, "hex");

    if (leftBuffer.length === 0 || rightBuffer.length === 0 || leftBuffer.length !== rightBuffer.length) {
      return false;
    }

    return timingSafeEqual(leftBuffer, rightBuffer);
  } catch {
    return false;
  }
}

export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (isKapsoProvider()) {
    if (!env.KAPSO_WEBHOOK_SECRET) {
      logger.warn("KAPSO_WEBHOOK_SECRET not configured; signature verification bypassed");
      return true;
    }

    if (!signatureHeader) {
      return false;
    }

    const expected = createHmac("sha256", env.KAPSO_WEBHOOK_SECRET).update(rawBody).digest("hex");
    return secureCompareHex(normalizeSignature(signatureHeader), expected);
  }

  if (!env.WHATSAPP_APP_SECRET) {
    logger.warn("WHATSAPP_APP_SECRET not configured; signature verification bypassed");
    return true;
  }

  if (!signatureHeader) {
    return false;
  }

  const expected = createHmac("sha256", env.WHATSAPP_APP_SECRET).update(rawBody).digest("hex");
  return secureCompareHex(normalizeSignature(signatureHeader), expected);
}

function buildAuthHeaders(): Record<string, string> {
  if (isKapsoProvider()) {
    if (!env.KAPSO_API_KEY) {
      throw new Error("KAPSO_API_KEY is not configured");
    }

    return {
      "X-API-Key": env.KAPSO_API_KEY,
    };
  }

  if (!env.WHATSAPP_ACCESS_TOKEN) {
    throw new Error("WHATSAPP_ACCESS_TOKEN is not configured");
  }

  return {
    Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
  };
}

function canSendMessages(): boolean {
  if (isKapsoProvider()) {
    return Boolean(env.WHATSAPP_PHONE_NUMBER_ID && env.KAPSO_API_KEY);
  }

  return Boolean(env.WHATSAPP_PHONE_NUMBER_ID && env.WHATSAPP_ACCESS_TOKEN);
}

export async function sendWhatsAppTextMessage(
  to: string,
  body: string,
  options?: { negocioId?: string | null; tipo?: string },
): Promise<void> {
  if (!canSendMessages()) {
    logger.info("Skipping WhatsApp send because provider credentials are missing", {
      provider: env.WHATSAPP_PROVIDER,
      to,
      body,
    });

    if (isSupabaseConfigured()) {
      await logOutboundMessage({
        negocioId: options?.negocioId ?? null,
        telefono: to,
        tipo: options?.tipo ?? "text",
        payload: { body },
        estado: "failed",
        error: "WhatsApp provider credentials missing",
      });
    }

    return;
  }

  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body },
  };

  const response = await fetch(graphApiUrl(`${env.WHATSAPP_PHONE_NUMBER_ID}/messages`), {
    method: "POST",
    headers: {
      ...buildAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();

    if (isSupabaseConfigured()) {
      await logOutboundMessage({
        negocioId: options?.negocioId ?? null,
        telefono: to,
        tipo: options?.tipo ?? "text",
        payload,
        estado: "failed",
        error: text,
      });
    }

    throw new Error(`Failed to send WhatsApp message: ${response.status} ${text}`);
  }

  if (isSupabaseConfigured()) {
    await logOutboundMessage({
      negocioId: options?.negocioId ?? null,
      telefono: to,
      tipo: options?.tipo ?? "text",
      payload,
      estado: "sent",
    });
  }
}

function mediaDownloadHeaders(): Record<string, string> {
  try {
    return buildAuthHeaders();
  } catch {
    return {};
  }
}

export async function downloadWhatsAppMediaByUrl(mediaUrl: string): Promise<Buffer> {
  const response = await fetch(mediaUrl, {
    headers: mediaDownloadHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed downloading media data from URL: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function downloadWhatsAppMedia(mediaId: string): Promise<Buffer> {
  if (mediaId.startsWith("http://") || mediaId.startsWith("https://")) {
    return downloadWhatsAppMediaByUrl(mediaId);
  }

  const metadataResponse = await fetch(graphApiUrl(mediaId), {
    headers: mediaDownloadHeaders(),
  });

  if (!metadataResponse.ok) {
    throw new Error(`Failed fetching media metadata for media_id=${mediaId}`);
  }

  const metadata = (await metadataResponse.json()) as { url?: string };
  if (!metadata.url) {
    throw new Error(`Media URL not available for media_id=${mediaId}`);
  }

  return downloadWhatsAppMediaByUrl(metadata.url);
}
