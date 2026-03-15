import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import type { IntentType, RegistrarCostoResult, RegistrarVentaResult } from "@/lib/domain/types";
import {
  classifyIntentHeuristic,
  extractCostoHeuristic,
  extractVentaHeuristic,
} from "@/lib/ai/fallback-parser";
import { OpenAIProvider } from "@/lib/ai/openai-provider";
import { classifiedIntentSchema, registrarCostoSchema, registrarVentaSchema } from "@/lib/ai/schemas";

function buildIntentPrompt(input: string): string {
  return `Clasifica este mensaje en uno de estos intents: registrar_venta, registrar_costo, consultar_metricas, estado_alertas, ayuda, saludo_general. Mensaje: ${input}`;
}

function buildExtractionPrompt(intent: "registrar_venta" | "registrar_costo", input: string): string {
  return `Extrae los campos del mensaje para intent=${intent}. Devuelve JSON con campos esperados. Mensaje: ${input}`;
}

function shouldUseHeuristicIntent(input: string): boolean {
  const heuristic = classifyIntentHeuristic(input);
  return heuristic.confianza >= 0.75;
}

export async function classifyIntent(input: string): Promise<{ intent: IntentType; confianza: number }> {
  if (shouldUseHeuristicIntent(input)) {
    return classifyIntentHeuristic(input);
  }

  if (!env.OPENAI_API_KEY) {
    return classifyIntentHeuristic(input);
  }

  try {
    const provider = new OpenAIProvider();
    return await provider.extractStructured<{ intent: IntentType; confianza: number }>(
      buildIntentPrompt(input),
      classifiedIntentSchema,
      {
        model: env.OPENAI_MODEL_ROUTER,
      },
    );
  } catch (error) {
    logger.warn("Falling back to heuristic intent classification", {
      error: error instanceof Error ? error.message : "unknown_error",
    });
    return classifyIntentHeuristic(input);
  }
}

export async function extractVenta(input: string): Promise<RegistrarVentaResult> {
  const heuristic = extractVentaHeuristic(input);
  if (heuristic.concepto || heuristic.monto || heuristic.cantidad) {
    return heuristic;
  }

  if (!env.OPENAI_API_KEY) {
    return heuristic;
  }

  try {
    const provider = new OpenAIProvider();
    return await provider.extractStructured<RegistrarVentaResult>(
      buildExtractionPrompt("registrar_venta", input),
      registrarVentaSchema,
      {
        model: env.OPENAI_MODEL_EXTRACTOR,
      },
    );
  } catch (error) {
    logger.warn("Falling back to heuristic venta extractor", {
      error: error instanceof Error ? error.message : "unknown_error",
    });
    return heuristic;
  }
}

export async function extractCosto(input: string): Promise<RegistrarCostoResult> {
  const heuristic = extractCostoHeuristic(input);
  if (heuristic.concepto || heuristic.monto) {
    return heuristic;
  }

  if (!env.OPENAI_API_KEY) {
    return heuristic;
  }

  try {
    const provider = new OpenAIProvider();
    return await provider.extractStructured<RegistrarCostoResult>(
      buildExtractionPrompt("registrar_costo", input),
      registrarCostoSchema,
      {
        model: env.OPENAI_MODEL_EXTRACTOR,
      },
    );
  } catch (error) {
    logger.warn("Falling back to heuristic costo extractor", {
      error: error instanceof Error ? error.message : "unknown_error",
    });
    return heuristic;
  }
}
