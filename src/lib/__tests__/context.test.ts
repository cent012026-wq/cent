import { describe, expect, it } from "vitest";

import { computeMissingFields, mergePendingWithUserReply } from "@/lib/services/context";

describe("conversation context", () => {
  it("detects missing required fields", () => {
    const missing = computeMissingFields({
      requiredAttributes: [
        {
          id: "1",
          negocio_id: "n1",
          nombre_campo: "concepto",
          tipo_dato: "text",
          opciones: null,
          es_core: true,
          es_obligatorio: true,
          orden: 0,
        },
        {
          id: "2",
          negocio_id: "n1",
          nombre_campo: "monto",
          tipo_dato: "number",
          opciones: null,
          es_core: true,
          es_obligatorio: true,
          orden: 1,
        },
      ],
      extracted: { concepto: "camisa" },
    });

    expect(missing).toEqual(["monto"]);
  });

  it("merges pending context with user reply", () => {
    const merged = mergePendingWithUserReply({
      pendingData: { concepto: "camisa" },
      missingFields: ["monto", "talla"],
      userReply: "25000",
    });

    expect(merged.merged).toMatchObject({ concepto: "camisa", monto: "25000" });
    expect(merged.missingFields).toEqual(["talla"]);
  });
});
