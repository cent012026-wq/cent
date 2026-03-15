import { addMinutes } from "date-fns";

import { getAdminClient } from "@/lib/db/admin";
import { publishDomainEvent } from "@/lib/events/bus";
import { clearOtp, increaseOtpAttempts, setOtp } from "@/lib/services/data-access";
import { canAttemptOtp, isOtpExpired } from "@/lib/services/auth-otp-utils";
import { sendWhatsAppTextMessage } from "@/lib/whatsapp/meta";

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

function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function requestOtpForPhone(phone: string): Promise<void> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("usuarios")
    .select("id, telefono, negocio_id, rol")
    .eq("telefono", phone)
    .eq("rol", "dueno")
    .eq("activo", true)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return;
  }

  const otp = generateOtpCode();
  const expiresAt = addMinutes(new Date(), 5).toISOString();

  await setOtp({
    userId: (data as { id: string }).id,
    code: otp,
    expiresAt,
  });

  await sendWhatsAppTextMessage(phone, `Tu código de acceso cent es: ${otp}. Expira en 5 minutos.`);
  publishDomainEvent({ type: "otp.requested", payload: { phone } });
}

export async function verifyOtpCode(phone: string, code: string): Promise<OtpValidationResult> {
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from("usuarios")
    .select("id, telefono, negocio_id, rol, codigo_otp, otp_expira, otp_intentos")
    .eq("telefono", phone)
    .eq("rol", "dueno")
    .eq("activo", true)
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
