import type { AtributoNegocio } from "@/lib/domain/types";

export function computeMissingFields(input: {
  requiredAttributes: AtributoNegocio[];
  extracted: Record<string, unknown>;
}): string[] {
  return input.requiredAttributes
    .map((attr) => attr.nombre_campo)
    .filter((name) => input.extracted[name] === undefined || input.extracted[name] === null || input.extracted[name] === "");
}

export function mergePendingWithUserReply(input: {
  pendingData: Record<string, unknown>;
  missingFields: string[];
  userReply: string;
}): { merged: Record<string, unknown>; missingFields: string[] } {
  if (input.missingFields.length === 0) {
    return {
      merged: input.pendingData,
      missingFields: [],
    };
  }

  const [current, ...rest] = input.missingFields;
  return {
    merged: {
      ...input.pendingData,
      [current]: input.userReply.trim(),
    },
    missingFields: rest,
  };
}
