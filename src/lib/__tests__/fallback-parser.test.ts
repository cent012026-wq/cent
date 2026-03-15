import { describe, expect, it } from "vitest";

import {
  classifyIntentHeuristic,
  extractCostoHeuristic,
  extractVentaHeuristic,
} from "@/lib/ai/fallback-parser";

describe("fallback parser", () => {
  it("classifies venta messages", () => {
    const result = classifyIntentHeuristic("Vendí 3 camisas a 25 mil");
    expect(result.intent).toBe("registrar_venta");
  });

  it("extracts venta fields", () => {
    const result = extractVentaHeuristic("Vendí 3 camisas a 25 mil");
    expect(result.intent).toBe("registrar_venta");
    expect(result.cantidad).toBe(3);
    expect(result.monto).toBe(25000);
    expect(result.datos_faltantes.length).toBeLessThan(2);
  });

  it("extracts costo fields", () => {
    const result = extractCostoHeuristic("Gasté 80 mil en luz");
    expect(result.intent).toBe("registrar_costo");
    expect(result.monto).toBe(80000);
  });
});
