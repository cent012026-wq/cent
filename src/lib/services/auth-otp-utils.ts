export function isOtpExpired(expiresAtIso: string, now = new Date()): boolean {
  return new Date(expiresAtIso).getTime() <= now.getTime();
}

export function canAttemptOtp(attempts: number): boolean {
  return attempts < 3;
}
