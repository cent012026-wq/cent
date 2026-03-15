import { z } from "zod";

export const intentSchema = z.enum([
  "registrar_venta",
  "registrar_costo",
  "consultar_metricas",
  "estado_alertas",
  "ayuda",
  "saludo_general",
]);

export const registrarVentaSchema = z.object({
  intent: z.literal("registrar_venta"),
  confianza: z.number().min(0).max(1),
  datos_faltantes: z.array(z.string()),
  concepto: z.string().optional(),
  monto: z.number().positive().optional(),
  cantidad: z.number().int().positive().optional(),
  atributos: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .default({}),
});

export const registrarCostoSchema = z.object({
  intent: z.literal("registrar_costo"),
  confianza: z.number().min(0).max(1),
  datos_faltantes: z.array(z.string()),
  concepto: z.string().optional(),
  monto: z.number().positive().optional(),
  atributos: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .default({}),
  comprobante_url: z.string().url().optional(),
});

export const classifiedIntentSchema = z.object({
  intent: intentSchema,
  confianza: z.number().min(0).max(1),
});
