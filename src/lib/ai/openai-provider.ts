import OpenAI, { toFile } from "openai";
import type { ZodTypeAny } from "zod";

import { env } from "@/lib/env";
import type { AIProvider } from "@/lib/ai/provider";

function stripFence(text: string): string {
  return text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
}

export class OpenAIProvider implements AIProvider {
  private readonly client: OpenAI;

  constructor(apiKey = env.OPENAI_API_KEY) {
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    this.client = new OpenAI({ apiKey });
  }

  async complete(prompt: string, options?: { model?: string; system?: string }): Promise<string> {
    const response = await this.client.responses.create({
      model: options?.model ?? env.OPENAI_MODEL_CHAT,
      instructions: options?.system,
      input: prompt,
      temperature: 0.2,
    });

    return response.output_text ?? "";
  }

  async extractStructured<T>(
    prompt: string,
    schema: ZodTypeAny,
    options?: { model?: string; system?: string },
  ): Promise<T> {
    const response = await this.client.responses.create({
      model: options?.model ?? env.OPENAI_MODEL_EXTRACTOR,
      instructions:
        options?.system ??
        "Responde exclusivamente JSON válido siguiendo el schema solicitado. No incluyas markdown.",
      input: prompt,
      temperature: 0,
    });

    const raw = stripFence(response.output_text ?? "{}");
    const parsed = JSON.parse(raw);
    return schema.parse(parsed) as T;
  }

  async transcribeAudio(buffer: Buffer): Promise<string> {
    const file = await toFile(buffer, "audio.ogg", { type: "audio/ogg" });
    const response = await this.client.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language: "es",
    });

    return response.text;
  }
}
