import type { IntentType, RegistrarCostoResult, RegistrarVentaResult } from "@/lib/domain/types";
import { extractCantidad, parseMonto } from "@/lib/utils/parsing";

function cleanConcept(text: string): string | undefined {
  const cleaned = text
    .toLowerCase()
    .replace(/(^|\s)se\s+vendieron(?=\s|$)/g, " ")
    .replace(/(^|\s)vendieron(?=\s|$)/g, " ")
    .replace(/(^|\s)vend[ií](?=\s|$)/g, " ")
    .replace(/(^|\s)gast[eé](?=\s|$)/g, " ")
    .replace(/(^|\s)gasto(?=\s|$)/g, " ")
    .replace(/(^|\s)pagu[eé](?=\s|$)/g, " ")
    .replace(/(^|\s)pago(?=\s|$)/g, " ")
    .replace(/(^|\s)cost[oó](?=\s|$)/g, " ")
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

function extractVentaMonto(text: string, cantidad?: number): number | undefined {
  const lower = text.toLowerCase();
  const perUnitMatch = lower.match(/\ba\s+(\d+[\d\.,]*)\s*(millon(?:es)?|k|mil)?\b/);
  if (perUnitMatch && cantidad) {
    const unitAmount = parseMonto(`${perUnitMatch[1]} ${perUnitMatch[2] ?? ""}`.trim());
    if (unitAmount) {
      return unitAmount * cantidad;
    }
  }

  const amount = parseMonto(text);
  const hasAmountMarker = /\$|\b(por|a|x|valor|pesos?|mil|k|millon(?:es)?)\b/.test(lower);

  if (!hasAmountMarker && cantidad && amount === cantidad) {
    return undefined;
  }

  return amount;
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
  const cantidad = extractCantidad(input);
  const monto = extractVentaMonto(input, cantidad);
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
