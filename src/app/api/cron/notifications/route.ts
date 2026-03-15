import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { runScheduledNotifications } from "@/lib/services/notifications";

export async function POST(request: Request): Promise<NextResponse> {
  const token = request.headers.get("x-cron-secret");

  if (env.CRON_SECRET && token !== env.CRON_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await runScheduledNotifications();

  return NextResponse.json({ ok: true });
}
