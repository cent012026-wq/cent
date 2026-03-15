import type { ZodTypeAny } from "zod";

export interface AIProvider {
  complete(prompt: string, options?: { model?: string; system?: string }): Promise<string>;
  extractStructured<T>(
    prompt: string,
    schema: ZodTypeAny,
    options?: { model?: string; system?: string },
  ): Promise<T>;
  transcribeAudio(buffer: Buffer): Promise<string>;
}
