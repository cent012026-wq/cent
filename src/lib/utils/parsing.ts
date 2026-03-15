export function normalizePhone(phone: string): string {
  const normalized = phone.replace(/[^\d+]/g, "").replace(/^00/, "+");
  if (!normalized) {
    return normalized;
  }

  return normalized.startsWith("+") ? normalized : `+${normalized}`;
}

export function parseMonto(raw: string): number | undefined {
  const lower = raw.toLowerCase();
  const matches = [...lower.matchAll(/(\d+[\d\.,]*)\s*(millon(?:es)?|k|mil)?/g)];
  if (matches.length === 0) {
    return undefined;
  }

  const preferred =
    matches.find((item) => item[2] === "millon" || item[2] === "millones") ??
    matches.find((item) => item[2] === "k" || item[2] === "mil") ??
    matches[matches.length - 1];

  const base = Number(preferred[1].replace(/\./g, "").replace(/,/g, "."));
  if (Number.isNaN(base)) {
    return undefined;
  }

  if (preferred[2] === "k" || preferred[2] === "mil") {
    return Math.round(base * 1000);
  }

  if (preferred[2] === "millon" || preferred[2] === "millones") {
    return Math.round(base * 1000000);
  }

  return Math.round(base);
}

export function extractCantidad(text: string): number | undefined {
  const match = text.match(/\b(\d{1,4})\b/);
  if (!match) {
    return undefined;
  }

  const value = Number(match[1]);
  return Number.isNaN(value) ? undefined : value;
}

export function safeNumber(input: unknown): number | undefined {
  if (typeof input === "number" && Number.isFinite(input)) {
    return input;
  }

  if (typeof input === "string") {
    const parsed = Number(input);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}
