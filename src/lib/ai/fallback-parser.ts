import type { IntentType, RegistrarCostoResult, RegistrarVentaResult } from "@/lib/domain/types";
import { extractCantidad, parseMonto } from "@/lib/utils/parsing";

function cleanConcept(text: string): string | undefined {
  const cleaned = text
    .toLowerCase()
    .replace(/\b(se\s+)?vend(?:i|í|io|ió|ieron|imos|iste|iendo)?\b/g, "")
    .replace(/\b(gast(?:e|é|o|ó|amos|aste)|pagu(?:e|é)|pago|cost[oó])\b/g, "")
    .replace(/\bx\s+valor\s+de\b/g, "")
    .replace(/\bpor\s+\d+[\d\.,]*\s*(k|mil|millon(?:es)?)?/g, "")
    .replace(/\ba\s+\d+[\d\.,]*\s*(k|mil|millon(?:es)?)?/g, "")
    .replace(/\b(valor|pesos?)\b/g, "")
    .replace(/\b(k|mil|millon(?:es)?)\b/g, "")
    .replace(/\d+/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned.length > 2 ? cleaned : undefined;
}

export function classifyIntentHeuristic(input: string): { intent: IntentType; confianza: number } {
  const text = input.toLowerCase();

  if (/hola|buenas|buenos d[ií]as|gracias|chao|bye/.test(text)) {
    return { intent: "saludo_general", confianza: 0.9 };
  }

  if (/ayuda|como uso|c[oó]mo uso|qu[eé] puedes/.test(text)) {
    return { intent: "ayuda", confianza: 0.85 };
  }

  if (/alerta|meta|objetivo/.test(text)) {
    return { intent: "estado_alertas", confianza: 0.8 };
  }

  if (/c[oó]mo vamos|resumen|m[eé]tricas|ventas hoy|hoy/.test(text)) {
    return { intent: "consultar_metricas", confianza: 0.78 };
  }

  if (/gast|costo|pagu[eé]|pagu\s/.test(text)) {
    return { intent: "registrar_costo", confianza: 0.83 };
  }

  if (/vend|venta|factur/.test(text)) {
    return { intent: "registrar_venta", confianza: 0.88 };
  }

  return { intent: "ayuda", confianza: 0.45 };
}

export function extractVentaHeuristic(input: string): RegistrarVentaResult {
  const monto = parseMonto(input);
  const cantidad = extractCantidad(input);
  const concepto = cleanConcept(input);

  const missing = [
    ...(concepto ? [] : ["concepto"]),
    ...(monto ? [] : ["monto"]),
    ...(cantidad ? [] : ["cantidad"]),
  ];

  return {
    intent: "registrar_venta",
    confianza: 0.7,
    datos_faltantes: missing,
    concepto,
    monto,
    cantidad,
    atributos: {},
  };
}

export function extractCostoHeuristic(input: string): RegistrarCostoResult {
  const monto = parseMonto(input);
  const concepto = cleanConcept(input);

  const missing = [...(concepto ? [] : ["concepto"]), ...(monto ? [] : ["monto"])];

  return {
    intent: "registrar_costo",
    confianza: 0.68,
    datos_faltantes: missing,
    concepto,
    monto,
    atributos: {},
  };
}
