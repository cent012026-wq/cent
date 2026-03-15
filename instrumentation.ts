import * as Sentry from "@sentry/nextjs";

import { env } from "@/lib/env";

export async function register(): Promise<void> {
  if (!env.SENTRY_DSN) {
    return;
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    tracesSampleRate: 0.2,
  });
}
