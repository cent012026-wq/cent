import { addMinutes } from "date-fns";

import { getAdminClient } from "@/lib/db/admin";
import { env } from "@/lib/env";
import { publishDomainEvent } from "@/lib/events/bus";
import { logger } from "@/lib/logger";
import {
  clearOtp,
  createSignupOwner,
  findUserByPhone,
  increaseOtpAttempts,
  setOtp,
} from "@/lib/services/data-access";
import { canAttemptOtp, isOtpExpired } from "@/lib/services/auth-otp-utils";
import { sendWhatsAppOtpTemplateMessage } from "@/lib/whatsapp/meta";

interface OtpValidationResult {
  ok: boolean;
  reason?: "not_found" | "expired" | "too_many_attempts" | "invalid_code";
  user?: {
    id: string;
    telefono: string;
    negocio_id: string;
    rol: "dueno" | "vendedor";
  };
}

export interface OtpRequestResult {
  ok: boolean;
  phone: string;
  delivery: "sent" | "not_sent";
  provider: "kapso" | "meta";
  mode: "login" | "signup";
  reason?: "send_failed" | "role_not_allowed" | "inactive";
  message: string;
  debug?: string;
}

function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function requestOtpForPhone(phone: string): Promise<OtpRequestResult> {
  let flow: "login" | "signup" = "login";
  let user = await findUserByPhone(phone);

  if (!user) {
    try {
      const created = await createSignupOwner(phone);
      user = created.owner;
      flow = "signup";
      logger.info("Created owner during OTP request", {
        phone,
        negocioId: created.negocio.id,
        ownerId: created.owner.id,
      });
    } catch (createError) {
      const code = (createError as { code?: string }).code;
      if (code === "23505") {
        user = await findUserByPhone(phone);
      } else {
        throw createError;
      }
    }
  }

  if (!user) {
    throw new Error(`Could not resolve or create user for phone ${phone}`);
  }

  if (user.rol !== "dueno") {
    return {
      ok: false,
      phone,
      delivery: "not_sent",
      provider: env.WHATSAPP_PROVIDER,
      mode: flow,
      reason: "role_not_allowed",
      message: "Ese número ya pertenece a un vendedor. Debes entrar con el número del dueño.",
    };
  }

  if (!user.activo) {
    return {
      ok: false,
      phone,
      delivery: "not_sent",
      provider: env.WHATSAPP_PROVIDER,
      mode: flow,
      reason: "inactive",
      message: "Ese número existe en cent, pero está inactivo.",
    };
  }

  const otp = generateOtpCode();
  const expiresAt = addMinutes(new Date(), 5).toISOString();

  await setOtp({
    userId: user.id,
    code: otp,
    expiresAt,
  });

  try {
    await sendWhatsAppOtpTemplateMessage(phone, otp, {
      negocioId: user.negocio_id,
      expirationMinutes: 5,
    });
    publishDomainEvent({ type: "otp.requested", payload: { phone } });

    return {
      ok: true,
      phone,
      delivery: "sent",
      provider: env.WHATSAPP_PROVIDER,
      mode: flow,
      message:
        flow === "signup"
          ? "Creamos tu cuenta inicial y enviamos el código por WhatsApp."
          : "Enviamos el código por WhatsApp.",
    };
  } catch (sendError) {
    return {
      ok: false,
      phone,
      delivery: "not_sent",
      provider: env.WHATSAPP_PROVIDER,
      mode: flow,
      reason: "send_failed",
      message:
        flow === "signup"
          ? "Creamos tu cuenta, pero no pudimos entregar el código OTP por WhatsApp."
          : "No pudimos entregar el código OTP por WhatsApp.",
      debug: sendError instanceof Error ? sendError.message : "unknown_error",
    };
  }
}

export async function verifyOtpCode(phone: string, code: string): Promise<OtpValidationResult> {
  const user = await findUserByPhone(phone);

  if (!user || user.rol !== "dueno" || !user.activo) {
    return { ok: false, reason: "not_found" };
  }

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("usuarios")
    .select("id, telefono, negocio_id, rol, codigo_otp, otp_expira, otp_intentos")
    .eq("id", user.id)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return { ok: false, reason: "not_found" };
  }

  const record = data as {
    id: string;
    telefono: string;
    negocio_id: string;
    rol: "dueno" | "vendedor";
    codigo_otp: string | null;
    otp_expira: string | null;
    otp_intentos: number | null;
  };

  if (!canAttemptOtp(record.otp_intentos ?? 0)) {
    return { ok: false, reason: "too_many_attempts" };
  }

  if (!record.codigo_otp || !record.otp_expira) {
    return { ok: false, reason: "invalid_code" };
  }

  if (isOtpExpired(record.otp_expira)) {
    await clearOtp(record.id);
    return { ok: false, reason: "expired" };
  }

  if (record.codigo_otp !== code) {
    await increaseOtpAttempts(record.id);
    return { ok: false, reason: "invalid_code" };
  }

  await clearOtp(record.id);

  return {
    ok: true,
    user: {
      id: record.id,
      telefono: record.telefono,
      negocio_id: record.negocio_id,
      rol: record.rol,
    },
  };
}
