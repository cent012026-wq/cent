import { describe, expect, it } from "vitest";

import { parseWebhookMessages } from "@/lib/whatsapp/webhook";

describe("webhook parser", () => {
  it("parses meta webhook payload", () => {
    const messages = parseWebhookMessages({
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    id: "wamid.meta.1",
                    from: "573001234567",
                    timestamp: "1718224617",
                    type: "text",
                    text: {
                      body: "Vendí 2 camisas",
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      messageId: "wamid.meta.1",
      from: "+573001234567",
      type: "text",
      text: "Vendí 2 camisas",
    });
  });

  it("parses kapso v2 envelope payload", () => {
    const messages = parseWebhookMessages({
      event: "message.received",
      data: {
        id: "evt_123",
        from: "573009998887",
        message_type: "audio",
        message: {
          id: "wamid.kapso.1",
          type: "audio",
        },
        kapso: {
          media_url: "https://cdn.kapso.ai/file.ogg",
          transcript: "Vendí 3 camisas a 25 mil",
        },
      },
    });

    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      messageId: "wamid.kapso.1",
      from: "+573009998887",
      type: "audio",
      mediaUrl: "https://cdn.kapso.ai/file.ogg",
      transcript: "Vendí 3 camisas a 25 mil",
    });
  });

  it("parses kapso batched payloads", () => {
    const messages = parseWebhookMessages({
      type: "whatsapp.message.received",
      batch: true,
      data: [
        {
          message: {
            id: "wamid.kapso.batch.1",
            type: "text",
            text: {
              body: "Vendí 2 cafés a 12000",
            },
            from: "573007750712",
            timestamp: "1718224617",
          },
          conversation: {
            phone_number: "573007750712",
          },
        },
      ],
    });

    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      messageId: "wamid.kapso.batch.1",
      from: "+573007750712",
      type: "text",
      text: "Vendí 2 cafés a 12000",
    });
  });

  it("parses kapso audio payload with nested transcript object", () => {
    const messages = parseWebhookMessages({
      type: "whatsapp.message.received",
      batch: true,
      data: [
        {
          from: "573005282031",
          audio: {
            id: "2148534835903045",
            url: "https://app.kapso.ai/audio.ogg",
          },
          kapso: {
            transcript: {
              text: "Vendí tres jeans por ciento cincuenta.",
            },
          },
          message: {
            id: "wamid.audio.1",
            type: "audio",
          },
          timestamp: "1773557957",
        },
      ],
    });

    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      messageId: "wamid.audio.1",
      from: "+573005282031",
      type: "audio",
      mediaId: "2148534835903045",
      mediaUrl: "https://app.kapso.ai/audio.ogg",
      transcript: "Vendí tres jeans por ciento cincuenta.",
    });
  });

  it("ignores outbound kapso echoes", () => {
    const messages = parseWebhookMessages({
      data: [
        {
          id: "wamid.outbound.1",
          from: "573005282031",
          text: "Hola. Estoy listo para registrar ventas y gastos de tu negocio.",
          message_type: "text",
          kapso: {
            direction: "outbound",
          },
        },
      ],
    });

    expect(messages).toHaveLength(0);
  });

  it("ignores kapso non-received events", () => {
    const messages = parseWebhookMessages({
      event: "whatsapp.message.sent",
      data: [
        {
          id: "wamid.outbound.2",
          from: "573005282031",
          message_type: "text",
          text: "hola",
          kapso: {
            direction: "outbound",
          },
        },
      ],
    });

    expect(messages).toHaveLength(0);
  });
});
