import type { WebhookMessage } from "@/lib/domain/types";
import { normalizePhone } from "@/lib/utils/parsing";

interface MetaWebhookPayload {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: Array<{
          id?: string;
          from?: string;
          timestamp?: string;
          type?: string;
          text?: { body?: string };
          audio?: { id?: string };
          image?: { id?: string };
        }>;
      };
    }>;
  }>;
}

function mapMessageType(value?: string): WebhookMessage["type"] {
  if (value === "text") {
    return "text";
  }

  if (value === "audio") {
    return "audio";
  }

  if (value === "image") {
    return "image";
  }

  return "unknown";
}

function parseMetaMessages(payload: MetaWebhookPayload): WebhookMessage[] {
  const output: WebhookMessage[] = [];

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const message of change.value?.messages ?? []) {
        if (!message.id || !message.from) {
          continue;
        }

        output.push({
          messageId: message.id,
          from: normalizePhone(message.from),
          type: mapMessageType(message.type),
          text: message.text?.body?.trim() ?? "",
          mediaId: message.audio?.id ?? message.image?.id,
          timestamp: message.timestamp,
        });
      }
    }
  }

  return output;
}

function readTextCandidate(data: Record<string, unknown>, message: Record<string, unknown>): string | undefined {
  const directText = (message.text as { body?: string } | undefined)?.body;
  if (directText) {
    return directText.trim();
  }

  const messageTypeDataText =
    (data.message_type_data as { text?: { body?: string } } | undefined)?.text?.body ??
    ((data.kapso as { message_type_data?: { text?: { body?: string } } } | undefined)?.message_type_data
      ?.text?.body ?? undefined);

  if (messageTypeDataText) {
    return messageTypeDataText.trim();
  }

  const contentText =
    ((data.kapso as { message_content?: { text?: string } } | undefined)?.message_content?.text ??
      undefined) ??
    ((data.message_content as { text?: string } | undefined)?.text ?? undefined);

  if (contentText) {
    return contentText.trim();
  }

  if (typeof data.text === "string") {
    return data.text.trim();
  }

  return undefined;
}

function parseKapsoData(data: Record<string, unknown>): WebhookMessage[] {
  const sharedFrom =
    (data.from as string | undefined) ??
    ((data.contact as { wa_id?: string } | undefined)?.wa_id ?? undefined) ??
    ((data.sender as { wa_id?: string } | undefined)?.wa_id ?? undefined);

  const candidateMessages = Array.isArray(data.messages)
    ? (data.messages as Array<Record<string, unknown>>)
    : [data.message as Record<string, unknown> | undefined];

  const output: WebhookMessage[] = [];

  for (const rawCandidate of candidateMessages) {
    const candidate = rawCandidate ?? {};
    const messageId =
      (candidate.id as string | undefined) ??
      (data.message_id as string | undefined) ??
      (data.id as string | undefined);

    const from =
      sharedFrom ??
      (candidate.from as string | undefined) ??
      ((candidate.contact as { wa_id?: string } | undefined)?.wa_id ?? undefined);

    if (!messageId || !from) {
      continue;
    }

    const sourceType =
      (data.message_type as string | undefined) ??
      (candidate.type as string | undefined) ??
      "unknown";

    const type = mapMessageType(sourceType);

    const mediaId =
      ((candidate.audio as { id?: string } | undefined)?.id ??
        (candidate.image as { id?: string } | undefined)?.id ??
        (data.media_id as string | undefined) ??
        ((data.kapso as { media_id?: string } | undefined)?.media_id ?? undefined));

    const mediaUrl =
      (data.media_url as string | undefined) ??
      ((data.kapso as { media_url?: string } | undefined)?.media_url ?? undefined);

    const transcript =
      (data.transcript as string | undefined) ??
      ((data.kapso as { transcript?: string } | undefined)?.transcript ?? undefined);

    const text = readTextCandidate(data, candidate);

    output.push({
      messageId,
      from: normalizePhone(from),
      type,
      text,
      mediaId,
      mediaUrl,
      transcript,
      timestamp:
        (candidate.timestamp as string | undefined) ??
        (data.timestamp as string | undefined) ??
        undefined,
    });
  }

  return output;
}

export function parseWebhookMessages(payload: unknown): WebhookMessage[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const objectPayload = payload as Record<string, unknown>;

  if (Array.isArray((objectPayload as MetaWebhookPayload).entry)) {
    return parseMetaMessages(objectPayload as MetaWebhookPayload);
  }

  if (Array.isArray(objectPayload.data)) {
    return (objectPayload.data as unknown[])
      .flatMap((item) =>
        item && typeof item === "object" ? parseKapsoData(item as Record<string, unknown>) : [],
      );
  }

  const kapsoCandidate = (objectPayload.data as Record<string, unknown> | undefined) ?? objectPayload;

  return parseKapsoData(kapsoCandidate);
}
