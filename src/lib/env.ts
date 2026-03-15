import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_JWT_SECRET: z.string().default("development-secret-change-me"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL_ROUTER: z.string().default("gpt-4o-mini"),
  OPENAI_MODEL_EXTRACTOR: z.string().default("gpt-4o-mini"),
  OPENAI_MODEL_SQL: z.string().default("gpt-4o"),
  OPENAI_MODEL_CHAT: z.string().default("gpt-4o-mini"),
  WHATSAPP_PROVIDER: z.enum(["meta", "kapso"]).default("kapso"),
  WHATSAPP_VERIFY_TOKEN: z.string().optional(),
  WHATSAPP_APP_SECRET: z.string().optional(),
  WHATSAPP_API_VERSION: z.string().default("v24.0"),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  KAPSO_API_KEY: z.string().optional(),
  KAPSO_WEBHOOK_SECRET: z.string().optional(),
  KAPSO_BASE_URL: z.string().url().default("https://api.kapso.ai"),
  CRON_SECRET: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

let cachedEnv: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid environment variables: ${parsed.error.message}`);
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

export const env = getEnv();
