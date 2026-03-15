export type Rol = "dueno" | "vendedor";

export type IntentType =
  | "registrar_venta"
  | "registrar_costo"
  | "consultar_metricas"
  | "estado_alertas"
  | "ayuda"
  | "saludo_general";

export type TipoTransaccion = "venta" | "costo";

export type TipoDatoAtributo = "text" | "number" | "select" | "boolean";

export type NotificacionTipo =
  | "venta_realtime"
  | "costo_realtime"
  | "resumen_diario"
  | "resumen_semanal"
  | "resumen_mensual";

export interface IntentResultBase {
  intent: IntentType;
  confianza: number;
  datos_faltantes: string[];
}

export interface RegistrarVentaResult extends IntentResultBase {
  intent: "registrar_venta";
  concepto?: string;
  monto?: number;
  cantidad?: number;
  atributos: Record<string, string | number | boolean>;
}

export interface RegistrarCostoResult extends IntentResultBase {
  intent: "registrar_costo";
  concepto?: string;
  monto?: number;
  atributos: Record<string, string | number | boolean>;
  comprobante_url?: string;
}

export interface Usuario {
  id: string;
  telefono: string;
  negocio_id: string;
  rol: Rol;
  nombre: string | null;
  activo: boolean;
  puede_registrar_costos: boolean;
}

export interface Negocio {
  id: string;
  nombre: string;
  nicho: string | null;
  plan: "trial" | "pro" | "business" | "frozen";
  trial_expires_at: string | null;
  timezone: string;
  config_agente: {
    nombre?: string;
    tono?: string;
    jerga?: string;
  } | null;
}

export interface AtributoNegocio {
  id: string;
  negocio_id: string;
  nombre_campo: string;
  tipo_dato: TipoDatoAtributo;
  opciones: string[] | null;
  es_core: boolean;
  es_obligatorio: boolean;
  orden: number | null;
}

export interface AlertaCondicion {
  campo: "monto" | "cantidad";
  operador: ">=" | ">" | "<=" | "<" | "=";
  valor?: number;
  filtros?: Record<string, string | number | boolean>;
  acumulador: "SUM";
}

export interface Alerta {
  id: string;
  negocio_id: string;
  nombre: string;
  condicion: AlertaCondicion;
  objetivo_numerico: number | null;
  progreso_actual: number;
  activa: boolean;
  notificada: boolean;
}

export interface ConversacionContexto {
  id: string;
  usuario_id: string;
  mensajes: Array<{ rol: "user" | "assistant"; contenido: string; timestamp: string }>;
  intent_pendiente: IntentType | "onboarding_audio" | null;
  datos_parciales: Record<string, unknown> | null;
  expires_at: string;
}

export interface NotificacionConfig {
  id: string;
  negocio_id: string;
  tipo: NotificacionTipo;
  activa: boolean;
  hora_envio: string | null;
  filtros: Record<string, unknown> | null;
  ultima_ejecucion: string | null;
}

export interface WebhookMessage {
  messageId: string;
  from: string;
  type: "text" | "audio" | "image" | "unknown";
  text?: string;
  mediaId?: string;
  mediaUrl?: string;
  transcript?: string;
  timestamp?: string;
}
