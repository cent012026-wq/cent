import { after, NextResponse } from "next/server";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { processIncomingWhatsAppPayload } from "@/lib/services/inbound-whatsapp";
import { verifyWebhookSignature } from "@/lib/whatsapp/meta";

export async function GET(request: Request): Promise<NextResponse> {
  if (env.WHATSAPP_PROVIDER === "kapso") {
    return NextResponse.json({ ok: true, provider: "kapso" });
  }

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const challenge = searchParams.get("hub.challenge");
  const verifyToken = searchParams.get("hub.verify_token");

  if (mode === "subscribe" && verifyToken && verifyToken === env.WHATSAPP_VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: Request): Promise<NextResponse> {
  const rawBody = await request.text();
  const signature =
    env.WHATSAPP_PROVIDER === "kapso"
      ? request.headers.get("x-webhook-signature")
      : request.headers.get("x-hub-signature-256");

  const validSignature = verifyWebhookSignature(rawBody, signature);
  if (!validSignature) {
    logger.warn("Invalid webhook signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as unknown;

  after(() => {
    processIncomingWhatsAppPayload(payload).catch((error) => {
      logger.error("Async processing of webhook failed", {
        error: error instanceof Error ? error.message : "unknown_error",
      });
    });
  });

  return NextResponse.json({ received: true });
}
