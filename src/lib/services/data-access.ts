import { addMinutes } from "date-fns";

import { getAdminClient } from "@/lib/db/admin";
import { logger } from "@/lib/logger";
import type {
  Alerta,
  AtributoNegocio,
  ConversacionContexto,
  Negocio,
  NotificacionConfig,
  TipoTransaccion,
  Usuario,
} from "@/lib/domain/types";

function nowIso(): string {
  return new Date().toISOString();
}

export async function registerInboundMessage(
  messageId: string,
  from: string,
  payload: unknown,
): Promise<boolean> {
  const supabase = getAdminClient();
  const { error } = await supabase.from("inbound_messages").insert({
    message_id: messageId,
    telefono: from,
    payload,
    created_at: nowIso(),
  });

  if (!error) {
    return true;
  }

  if ((error as { code?: string }).code === "23505") {
    return false;
  }

  throw error;
}

export async function findUserByPhone(phone: string): Promise<Usuario | null> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("usuarios")
    .select("id, telefono, negocio_id, rol, nombre, activo, puede_registrar_costos")
    .eq("telefono", phone)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as Usuario | null) ?? null;
}

export async function findUserById(userId: string): Promise<Usuario | null> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("usuarios")
    .select("id, telefono, negocio_id, rol, nombre, activo, puede_registrar_costos")
    .eq("id", userId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as Usuario | null) ?? null;
}

export async function createNegocioWithOwner(input: {
  telefono: string;
  nombreNegocio: string;
  nicho: string;
  contextoIA: string;
  atributos: Array<{ nombre_campo: string; tipo_dato: string; es_obligatorio: boolean }>;
}): Promise<{ negocio: Negocio; owner: Usuario }> {
  const supabase = getAdminClient();

  const { data: negocio, error: negocioError } = await supabase
    .from("negocios")
    .insert({
      nombre: input.nombreNegocio,
      nicho: input.nicho,
      contexto_ia: input.contextoIA,
      config_agente: { nombre: "VendBot", tono: "amable", jerga: "neutro" },
      plan: "trial",
      trial_expires_at: addMinutes(new Date(), 60 * 24 * 30).toISOString(),
    })
    .select("id, nombre, nicho, plan, trial_expires_at, timezone, config_agente")
    .single();

  if (negocioError || !negocio) {
    throw negocioError ?? new Error("Failed creating negocio");
  }

  const { data: owner, error: ownerError } = await supabase
    .from("usuarios")
    .insert({
      telefono: input.telefono,
      negocio_id: negocio.id,
      rol: "dueno",
      nombre: "Dueño",
      activo: true,
      puede_registrar_costos: true,
    })
    .select("id, telefono, negocio_id, rol, nombre, activo, puede_registrar_costos")
    .single();

  if (ownerError || !owner) {
    throw ownerError ?? new Error("Failed creating owner user");
  }

  const defaultCore = [
    { nombre_campo: "concepto", tipo_dato: "text", es_core: true, es_obligatorio: true, orden: 0 },
    { nombre_campo: "monto", tipo_dato: "number", es_core: true, es_obligatorio: true, orden: 1 },
  ];

  const dynamic = input.atributos.map((attr, index) => ({
    negocio_id: negocio.id,
    nombre_campo: attr.nombre_campo,
    tipo_dato: attr.tipo_dato,
    es_core: false,
    es_obligatorio: attr.es_obligatorio,
    orden: index + 2,
  }));

  const { error: attrsError } = await supabase.from("atributos_negocio").insert(
    [...defaultCore.map((attr) => ({ ...attr, negocio_id: negocio.id })), ...dynamic],
  );

  if (attrsError) {
    throw attrsError;
  }

  return {
    negocio: negocio as Negocio,
    owner: owner as Usuario,
  };
}

export async function createSignupOwner(phone: string): Promise<{ negocio: Negocio; owner: Usuario }> {
  return createNegocioWithOwner({
    telefono: phone,
    nombreNegocio: "Mi negocio",
    nicho: "comercio",
    contextoIA: "Alta inicial desde login web",
    atributos: [],
  });
}

export async function findNegocioById(negocioId: string): Promise<Negocio | null> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("negocios")
    .select("id, nombre, nicho, plan, trial_expires_at, timezone, config_agente")
    .eq("id", negocioId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as Negocio | null) ?? null;
}

export async function listAtributosObligatorios(negocioId: string): Promise<AtributoNegocio[]> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("atributos_negocio")
    .select("id, negocio_id, nombre_campo, tipo_dato, opciones, es_core, es_obligatorio, orden")
    .eq("negocio_id", negocioId)
    .eq("es_obligatorio", true)
    .order("orden", { ascending: true });

  if (error) {
    throw error;
  }

  return (data as AtributoNegocio[]) ?? [];
}

export async function listAtributos(negocioId: string): Promise<AtributoNegocio[]> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("atributos_negocio")
    .select("id, negocio_id, nombre_campo, tipo_dato, opciones, es_core, es_obligatorio, orden")
    .eq("negocio_id", negocioId)
    .order("orden", { ascending: true });

  if (error) {
    throw error;
  }

  return (data as AtributoNegocio[]) ?? [];
}

export async function getActiveConversationContext(
  usuarioId: string,
): Promise<ConversacionContexto | null> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("conversaciones_contexto")
    .select("id, usuario_id, mensajes, intent_pendiente, datos_parciales, expires_at")
    .eq("usuario_id", usuarioId)
    .gt("expires_at", nowIso())
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as ConversacionContexto | null) ?? null;
}

export async function upsertConversationContext(input: {
  usuarioId: string;
  intentPendiente: string;
  datosParciales: Record<string, unknown>;
  mensajes: Array<{ rol: "user" | "assistant"; contenido: string; timestamp: string }>;
}): Promise<void> {
  const supabase = getAdminClient();

  const payload = {
    usuario_id: input.usuarioId,
    intent_pendiente: input.intentPendiente,
    datos_parciales: input.datosParciales,
    mensajes: input.mensajes,
    expires_at: addMinutes(new Date(), 30).toISOString(),
  };

  const { error } = await supabase.from("conversaciones_contexto").upsert(payload, {
    onConflict: "usuario_id",
  });

  if (error) {
    throw error;
  }
}

export async function clearConversationContext(usuarioId: string): Promise<void> {
  const supabase = getAdminClient();
  const { error } = await supabase.from("conversaciones_contexto").delete().eq("usuario_id", usuarioId);
  if (error) {
    throw error;
  }
}

export async function insertTransaction(input: {
  negocioId: string;
  usuarioId: string;
  tipo: TipoTransaccion;
  concepto: string;
  monto: number;
  cantidad?: number;
  detalles?: Record<string, unknown>;
  comprobanteUrl?: string;
  mensajeOriginal: string;
  messageId: string;
}): Promise<{ id: string }> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("transacciones")
    .insert({
      negocio_id: input.negocioId,
      usuario_id: input.usuarioId,
      tipo: input.tipo,
      concepto: input.concepto,
      monto: input.monto,
      cantidad: input.cantidad ?? 1,
      detalles: input.detalles ?? {},
      comprobante_url: input.comprobanteUrl ?? null,
      mensaje_original: input.mensajeOriginal,
      message_id: input.messageId,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw error ?? new Error("Failed to create transaction");
  }

  return { id: (data as { id: string }).id };
}

export async function listTransactions(input: {
  negocioId: string;
  from?: string;
  to?: string;
  tipo?: TipoTransaccion;
  usuarioId?: string;
}): Promise<Array<Record<string, unknown>>> {
  const supabase = getAdminClient();
  let query = supabase
    .from("transacciones")
    .select("id, negocio_id, usuario_id, tipo, concepto, monto, cantidad, detalles, comprobante_url, created_at")
    .eq("negocio_id", input.negocioId)
    .order("created_at", { ascending: false });

  if (input.from) {
    query = query.gte("created_at", input.from);
  }

  if (input.to) {
    query = query.lte("created_at", input.to);
  }

  if (input.tipo) {
    query = query.eq("tipo", input.tipo);
  }

  if (input.usuarioId) {
    query = query.eq("usuario_id", input.usuarioId);
  }

  const { data, error } = await query.limit(200);

  if (error) {
    throw error;
  }

  return (data as Array<Record<string, unknown>>) ?? [];
}

export async function listAlertasActivas(negocioId: string): Promise<Alerta[]> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("alertas")
    .select("id, negocio_id, nombre, condicion, objetivo_numerico, progreso_actual, activa, notificada")
    .eq("negocio_id", negocioId)
    .eq("activa", true);

  if (error) {
    throw error;
  }

  return (data as Alerta[]) ?? [];
}

export async function updateAlertaProgress(input: {
  alertaId: string;
  progresoActual: number;
  notificada?: boolean;
}): Promise<void> {
  const supabase = getAdminClient();
  const payload: Record<string, unknown> = {
    progreso_actual: input.progresoActual,
  };

  if (input.notificada !== undefined) {
    payload.notificada = input.notificada;
  }

  const { error } = await supabase.from("alertas").update(payload).eq("id", input.alertaId);
  if (error) {
    throw error;
  }
}

export async function createAlerta(input: {
  negocioId: string;
  nombre: string;
  condicion: Record<string, unknown>;
  objetivoNumerico?: number | null;
}): Promise<{ id: string }> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("alertas")
    .insert({
      negocio_id: input.negocioId,
      nombre: input.nombre,
      condicion: input.condicion,
      objetivo_numerico: input.objetivoNumerico ?? null,
      activa: true,
      notificada: false,
      progreso_actual: 0,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw error ?? new Error("Failed creating alert");
  }

  return { id: (data as { id: string }).id };
}

export async function updateAlertaById(input: {
  alertaId: string;
  negocioId: string;
  nombre?: string;
  activa?: boolean;
  condicion?: Record<string, unknown>;
  objetivoNumerico?: number;
}): Promise<void> {
  const supabase = getAdminClient();
  const { error } = await supabase
    .from("alertas")
    .update({
      ...(input.nombre !== undefined ? { nombre: input.nombre } : {}),
      ...(input.activa !== undefined ? { activa: input.activa } : {}),
      ...(input.condicion !== undefined ? { condicion: input.condicion } : {}),
      ...(input.objetivoNumerico !== undefined ? { objetivo_numerico: input.objetivoNumerico } : {}),
    })
    .eq("id", input.alertaId)
    .eq("negocio_id", input.negocioId);

  if (error) {
    throw error;
  }
}

export async function listNotificacionConfig(negocioId: string): Promise<NotificacionConfig[]> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("notificaciones_config")
    .select("id, negocio_id, tipo, activa, hora_envio, filtros, ultima_ejecucion")
    .eq("negocio_id", negocioId);

  if (error) {
    throw error;
  }

  return (data as NotificacionConfig[]) ?? [];
}

export async function upsertNotificacionConfig(input: {
  negocioId: string;
  tipo: string;
  activa: boolean;
  horaEnvio?: string | null;
  filtros?: Record<string, unknown> | null;
}): Promise<{ id: string }> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("notificaciones_config")
    .upsert(
      {
        negocio_id: input.negocioId,
        tipo: input.tipo,
        activa: input.activa,
        hora_envio: input.horaEnvio ?? null,
        filtros: input.filtros ?? null,
      },
      { onConflict: "negocio_id,tipo" },
    )
    .select("id")
    .single();

  if (error || !data) {
    throw error ?? new Error("Failed upserting notification config");
  }

  return { id: (data as { id: string }).id };
}

export async function patchNotificacionConfig(input: {
  id: string;
  negocioId: string;
  activa?: boolean;
  horaEnvio?: string | null;
  filtros?: Record<string, unknown> | null;
  ultimaEjecucion?: string;
}): Promise<void> {
  const supabase = getAdminClient();
  const payload: Record<string, unknown> = {};

  if (input.activa !== undefined) {
    payload.activa = input.activa;
  }
  if (input.horaEnvio !== undefined) {
    payload.hora_envio = input.horaEnvio;
  }
  if (input.filtros !== undefined) {
    payload.filtros = input.filtros;
  }
  if (input.ultimaEjecucion !== undefined) {
    payload.ultima_ejecucion = input.ultimaEjecucion;
  }

  const { error } = await supabase
    .from("notificaciones_config")
    .update(payload)
    .eq("id", input.id)
    .eq("negocio_id", input.negocioId);

  if (error) {
    throw error;
  }
}

export async function listDueOwnersByNegocio(negocioId: string): Promise<Usuario[]> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("usuarios")
    .select("id, telefono, negocio_id, rol, nombre, activo, puede_registrar_costos")
    .eq("negocio_id", negocioId)
    .eq("rol", "dueno")
    .eq("activo", true);

  if (error) {
    throw error;
  }

  return (data as Usuario[]) ?? [];
}

export async function setOtp(input: {
  userId: string;
  code: string;
  expiresAt: string;
}): Promise<void> {
  const supabase = getAdminClient();
  const { error } = await supabase
    .from("usuarios")
    .update({ codigo_otp: input.code, otp_expira: input.expiresAt, otp_intentos: 0 })
    .eq("id", input.userId);

  if (error) {
    throw error;
  }
}

export async function increaseOtpAttempts(userId: string): Promise<void> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("usuarios")
    .select("otp_intentos")
    .eq("id", userId)
    .single();

  if (error) {
    throw error;
  }

  const current = Number((data as { otp_intentos?: number }).otp_intentos ?? 0);
  const { error: updateError } = await supabase
    .from("usuarios")
    .update({ otp_intentos: current + 1 })
    .eq("id", userId);

  if (updateError) {
    throw updateError;
  }
}

export async function clearOtp(userId: string): Promise<void> {
  const supabase = getAdminClient();
  const { error } = await supabase
    .from("usuarios")
    .update({ codigo_otp: null, otp_expira: null, otp_intentos: 0 })
    .eq("id", userId);

  if (error) {
    throw error;
  }
}

export async function logOutboundMessage(input: {
  negocioId: string | null;
  telefono: string;
  tipo: string;
  payload: unknown;
  estado: "sent" | "failed";
  error?: string;
}): Promise<void> {
  const supabase = getAdminClient();
  const { error } = await supabase.from("outbound_messages").insert({
    negocio_id: input.negocioId,
    telefono: input.telefono,
    tipo: input.tipo,
    payload: input.payload,
    estado: input.estado,
    error: input.error ?? null,
  });

  if (error) {
    logger.warn("failed_to_log_outbound_message", {
      error: error.message,
      telefono: input.telefono,
    });
  }
}

export async function listNegociosForTrialReminders(referenceIso: string): Promise<Negocio[]> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("negocios")
    .select("id, nombre, nicho, plan, trial_expires_at, timezone, config_agente")
    .eq("plan", "trial")
    .not("trial_expires_at", "is", null)
    .lte("trial_expires_at", referenceIso);

  if (error) {
    throw error;
  }

  return (data as Negocio[]) ?? [];
}

export async function freezeNegocio(negocioId: string): Promise<void> {
  const supabase = getAdminClient();
  const { error } = await supabase.from("negocios").update({ plan: "frozen" }).eq("id", negocioId);
  if (error) {
    throw error;
  }
}

export async function listTeamUsers(negocioId: string): Promise<Usuario[]> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("usuarios")
    .select("id, telefono, negocio_id, rol, nombre, activo, puede_registrar_costos")
    .eq("negocio_id", negocioId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data as Usuario[]) ?? [];
}

export async function listAllAlertas(negocioId: string): Promise<Alerta[]> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("alertas")
    .select("id, negocio_id, nombre, condicion, objetivo_numerico, progreso_actual, activa, notificada")
    .eq("negocio_id", negocioId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data as Alerta[]) ?? [];
}

export async function updateNegocioConfigAgente(input: {
  negocioId: string;
  config: Record<string, unknown>;
}): Promise<void> {
  const supabase = getAdminClient();
  const { error } = await supabase
    .from("negocios")
    .update({ config_agente: input.config })
    .eq("id", input.negocioId);

  if (error) {
    throw error;
  }
}

export async function listAllNegocios(): Promise<Negocio[]> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("negocios")
    .select("id, nombre, nicho, plan, trial_expires_at, timezone, config_agente");

  if (error) {
    throw error;
  }

  return (data as Negocio[]) ?? [];
}
