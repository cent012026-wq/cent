import { describe, expect, it } from "vitest";

import { canAttemptOtp, isOtpExpired } from "@/lib/services/auth-otp-utils";

describe("otp utils", () => {
  it("limits OTP attempts to 3", () => {
    expect(canAttemptOtp(0)).toBe(true);
    expect(canAttemptOtp(2)).toBe(true);
    expect(canAttemptOtp(3)).toBe(false);
  });

  it("validates OTP expiration", () => {
    const now = new Date("2026-03-04T10:00:00.000Z");
    expect(isOtpExpired("2026-03-04T09:59:59.000Z", now)).toBe(true);
    expect(isOtpExpired("2026-03-04T10:05:00.000Z", now)).toBe(false);
  });
});
