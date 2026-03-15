import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import ffmpegPath from "ffmpeg-static";
import OpenAI, { toFile } from "openai";
import type { ZodTypeAny } from "zod";

import { env } from "@/lib/env";
import type { AIProvider } from "@/lib/ai/provider";

function stripFence(text: string): string {
  return text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
}

function buildHeaders(baseUrl: string): Record<string, string> | undefined {
  if (!baseUrl.includes("openrouter.ai")) {
    return undefined;
  }

  return {
    "HTTP-Referer": env.OPENAI_SITE_URL ?? env.NEXT_PUBLIC_APP_URL,
    "X-Title": env.OPENAI_APP_NAME,
  };
}

async function convertAudioToWav(buffer: Buffer): Promise<Buffer> {
  if (!ffmpegPath) {
    throw new Error("ffmpeg-static is not available");
  }

  const binaryPath = ffmpegPath;
  const dir = await mkdtemp(join(tmpdir(), "cent-stt-"));
  const inputPath = join(dir, "input.ogg");
  const outputPath = join(dir, "output.wav");

  try {
    await writeFile(inputPath, buffer);

    await new Promise<void>((resolve, reject) => {
      const process = spawn(binaryPath, ["-y", "-i", inputPath, "-ar", "16000", "-ac", "1", outputPath], {
        stdio: ["ignore", "ignore", "pipe"],
      });

      let stderr = "";
      process.stderr?.on("data", (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      process.on("error", reject);
      process.on("close", (code: number | null) => {
        if (code === 0) {
          resolve();
          return;
        }

        reject(new Error(`ffmpeg failed with code ${code}: ${stderr}`));
      });
    });

    return await readFile(outputPath);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export class OpenAIProvider implements AIProvider {
  private readonly client: OpenAI;
  private readonly transcriptionClient: OpenAI | null;
  private readonly transcriptionApiKey: string | null;
  private readonly transcriptionBaseUrl: string;

  constructor(apiKey = env.OPENAI_API_KEY) {
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    this.client = new OpenAI({
      apiKey,
      baseURL: env.OPENAI_BASE_URL,
      defaultHeaders: buildHeaders(env.OPENAI_BASE_URL),
    });

    this.transcriptionApiKey = env.STT_API_KEY ?? env.OPENAI_API_KEY ?? null;
    this.transcriptionBaseUrl = env.STT_BASE_URL;
    this.transcriptionClient =
      this.transcriptionApiKey && !this.transcriptionBaseUrl.includes("openrouter.ai")
        ? new OpenAI({
            apiKey: this.transcriptionApiKey,
            baseURL: this.transcriptionBaseUrl,
            defaultHeaders: buildHeaders(this.transcriptionBaseUrl),
          })
        : null;
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
    if (!this.transcriptionApiKey) {
      throw new Error("STT_API_KEY or OPENAI_API_KEY is not configured");
    }

    if (this.transcriptionBaseUrl.includes("openrouter.ai")) {
      const response = await fetch(`${this.transcriptionBaseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.transcriptionApiKey}`,
          "Content-Type": "application/json",
          ...buildHeaders(this.transcriptionBaseUrl),
        },
        body: JSON.stringify({
          model: env.STT_MODEL,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Transcribe este audio en espanol. Devuelve solo la transcripcion literal, sin resumen ni explicaciones.",
                },
                {
                  type: "input_audio",
                  input_audio: {
                    data: buffer.toString("base64"),
                    format: env.STT_AUDIO_FORMAT,
                  },
                },
              ],
            },
          ],
          temperature: 0,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenRouter STT request failed: ${response.status} ${await response.text()}`);
      }

      const payload = (await response.json()) as {
        choices?: Array<{
          message?: {
            content?:
              | string
              | Array<{
                  type?: string;
                  text?: string;
                }>;
          };
        }>;
      };

      const content = payload.choices?.[0]?.message?.content;
      if (typeof content === "string") {
        return content.trim();
      }

      if (Array.isArray(content)) {
        return content
          .filter((part) => part.type === "text" && typeof part.text === "string")
          .map((part) => part.text?.trim() ?? "")
          .join("\n")
          .trim();
      }

      throw new Error("OpenRouter STT response did not include transcript text");
    }

    if (!this.transcriptionClient) {
      throw new Error("STT_API_KEY is not configured");
    }

    const wavBuffer = await convertAudioToWav(buffer);
    const file = await toFile(wavBuffer, "audio.wav", { type: "audio/wav" });
    const response = await this.transcriptionClient.audio.transcriptions.create({
      file,
      model: env.STT_MODEL,
      language: "es",
    });

    return response.text;
  }
}
