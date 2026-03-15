import { z } from "zod";

import { env } from "@/lib/env";
import { OpenAIProvider } from "@/lib/ai/openai-provider";
import { logger } from "@/lib/logger";
import { createNegocioWithOwner } from "@/lib/services/data-access";

const onboardingSchema = z.object({
  nicho: z.string().min(2),
  nombre_negocio: z.string().min(2),
  atributos: z
    .array(
      z.object({
        nombre_campo: z.string().min(2),
        tipo_dato: z.enum(["text", "number", "select", "boolean"]),
        es_obligatorio: z.boolean(),
      }),
    )
    .max(10),
});

function heuristicOnboarding(transcript: string) {
  const lower = transcript.toLowerCase();

  const nicho = lower.includes("ropa")
    ? "ropa"
    : lower.includes("comida")
      ? "comida"
      : lower.includes("ferreter")
        ? "ferreteria"
        : "comercio";

  const atributos = [
    { nombre_campo: "cantidad", tipo_dato: "number", es_obligatorio: true as const },
    { nombre_campo: "metodo_pago", tipo_dato: "select", es_obligatorio: false as const },
  ];

  if (nicho === "ropa") {
    atributos.push({ nombre_campo: "talla", tipo_dato: "text", es_obligatorio: true });
    atributos.push({ nombre_campo: "color", tipo_dato: "text", es_obligatorio: false });
  }

  return {
    nicho,
    nombre_negocio: "Mi Negocio",
    atributos,
  };
}

export async function runAudioOnboarding(input: {
  telefono: string;
  transcript: string;
}): Promise<{ negocioNombre: string; nicho: string; atributos: string[] }> {
  const modelOutput = await (async () => {
    if (!env.OPENAI_API_KEY) {
      return heuristicOnboarding(input.transcript);
    }

    try {
      const provider = new OpenAIProvider();
      return await provider.extractStructured<z.infer<typeof onboardingSchema>>(
        `Analiza este audio transcrito de onboarding de negocio y extrae JSON con nicho, nombre_negocio y atributos. Transcripción: ${input.transcript}`,
        onboardingSchema,
        {
          model: env.OPENAI_MODEL_CHAT,
        },
      );
    } catch (error) {
      logger.warn("Falling back to heuristic onboarding", {
        error: error instanceof Error ? error.message : "unknown_error",
      });
      return heuristicOnboarding(input.transcript);
    }
  })();

  const result = await createNegocioWithOwner({
    telefono: input.telefono,
    nombreNegocio: modelOutput.nombre_negocio,
    nicho: modelOutput.nicho,
    contextoIA: input.transcript,
    atributos: modelOutput.atributos,
  });

  return {
    negocioNombre: result.negocio.nombre,
    nicho: result.negocio.nicho ?? "comercio",
    atributos: modelOutput.atributos.map((item) => item.nombre_campo),
  };
}
