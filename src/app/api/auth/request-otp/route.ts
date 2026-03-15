import { NextResponse } from "next/server";
import { z } from "zod";

import { requestOtpForPhone } from "@/lib/services/auth-otp";
import { normalizePhone } from "@/lib/utils/parsing";

const requestSchema = z.object({
  telefono: z.string().min(8),
});

export async function POST(request: Request): Promise<NextResponse> {
  const json = await request.json();
  const parsed = requestSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await requestOtpForPhone(normalizePhone(parsed.data.telefono));

  return NextResponse.json({ ok: true });
}
