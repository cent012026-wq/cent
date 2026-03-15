import { addMinutes } from "date-fns";

import { logger } from "@/lib/logger";
import { canAttemptOtp, isOtpExpired } from "@/lib/services/auth-otp-utils";
import {
  clearOtp,
  createTeamUser,
  findTeamUserById,
  findUserByPhone,
  increaseOtpAttempts,
  setOtp,
  updateTeamUserProfile,
} from "@/lib/services/data-access";
import { sendWhatsAppOtpTemplateMessage } from "@/lib/whatsapp/meta";

const SELLER_OTP_EXPIRATION_MINUTES = 10;

function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function inviteSellerByOtp(input: {
  negocioId: string;
  telefono: string;
  nombre: string;
  puedeRegistrarCostos: boolean;
}): Promise<{
  user: {
    id: string;
    telefono: string;
    nombre: string | null;
    activo: boolean;
    otp_expira?: string | null;
  };
  mode: "created" | "resent";
}> {
  const existing = await findUserByPhone(input.telefono);

  let user;
  let mode: "created" | "resent" = "created";

  if (existing) {
    if (existing.negocio_id !== input.negocioId) {
      throw new Error("Ese número ya está asociado a otra cuenta dentro de cent.");
    }

    if (existing.rol !== "vendedor") {
      throw new Error("Ese número ya pertenece al dueño del negocio.");
    }

    if (existing.activo) {
      throw new Error("Ese vendedor ya está verificado y activo.");
    }

    user = await updateTeamUserProfile({
      negocioId: input.negocioId,
      userId: existing.id,
      nombre: input.nombre,
      activo: false,
      puedeRegistrarCostos: input.puedeRegistrarCostos,
    });
    mode = "resent";
  } else {
    user = await createTeamUser({
      negocioId: input.negocioId,
      telefono: input.telefono,
      nombre: input.nombre,
      puedeRegistrarCostos: input.puedeRegistrarCostos,
    });
  }

  const otp = generateOtpCode();
  const expiresAt = addMinutes(new Date(), SELLER_OTP_EXPIRATION_MINUTES).toISOString();

  await setOtp({
    userId: user.id,
    code: otp,
    expiresAt,
  });

  await sendWhatsAppOtpTemplateMessage(input.telefono, otp, {
    negocioId: input.negocioId,
    expirationMinutes: SELLER_OTP_EXPIRATION_MINUTES,
  });

  logger.info("seller_invitation_sent", {
    negocioId: input.negocioId,
    userId: user.id,
    telefono: input.telefono,
    mode,
  });

  return {
    user: {
      id: user.id,
      telefono: user.telefono,
      nombre: user.nombre,
      activo: false,
      otp_expira: expiresAt,
    },
    mode,
  };
}

export async function resendSellerOtp(input: {
  negocioId: string;
  userId: string;
}): Promise<void> {
  const user = await findTeamUserById(input);

  if (!user) {
    throw new Error("Team user not found");
  }

  if (user.rol !== "vendedor") {
    throw new Error("Only seller records can be updated from this action");
  }

  if (user.activo) {
    throw new Error("Ese vendedor ya está verificado.");
  }

  const otp = generateOtpCode();
  const expiresAt = addMinutes(new Date(), SELLER_OTP_EXPIRATION_MINUTES).toISOString();

  await setOtp({
    userId: user.id,
    code: otp,
    expiresAt,
  });

  await sendWhatsAppOtpTemplateMessage(user.telefono, otp, {
    negocioId: input.negocioId,
    expirationMinutes: SELLER_OTP_EXPIRATION_MINUTES,
  });

  await updateTeamUserProfile({
    negocioId: input.negocioId,
    userId: user.id,
    otpExpira: expiresAt,
    otpIntentos: 0,
  });
}

export async function verifySellerOtp(input: {
  negocioId: string;
  userId: string;
  code: string;
}): Promise<void> {
  const user = await findTeamUserById(input);

  if (!user) {
    throw new Error("Team user not found");
  }

  if (user.rol !== "vendedor") {
    throw new Error("Only seller records can be updated from this action");
  }

  if (user.activo) {
    return;
  }

  const record = await findUserByPhone(user.telefono);
  if (!record || record.id !== user.id) {
    throw new Error("Team user not found");
  }

  if (!canAttemptOtp(record.otp_intentos ?? 0)) {
    throw new Error("El vendedor superó el máximo de intentos. Reenvía un nuevo OTP.");
  }

  if (!record.codigo_otp || !record.otp_expira) {
    throw new Error("No hay un OTP pendiente para este vendedor.");
  }

  if (isOtpExpired(record.otp_expira)) {
    await clearOtp(record.id);
    await updateTeamUserProfile({
      negocioId: input.negocioId,
      userId: user.id,
      otpExpira: null,
      otpIntentos: 0,
    });
    throw new Error("El OTP expiró. Reenvía uno nuevo.");
  }

  if (record.codigo_otp !== input.code) {
    await increaseOtpAttempts(record.id);
    throw new Error("El código no coincide.");
  }

  await clearOtp(record.id);
  await updateTeamUserProfile({
    negocioId: input.negocioId,
    userId: user.id,
    activo: true,
    otpExpira: null,
    otpIntentos: 0,
  });
}
