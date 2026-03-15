import { z } from "zod";

const emptyToUndefined = (value: unknown) => {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }

  return value;
};

const optionalString = () => z.preprocess(emptyToUndefined, z.string().optional());
const optionalUrl = () => z.preprocess(emptyToUndefined, z.string().url().optional());
const defaultedString = (value: string) => z.preprocess(emptyToUndefined, z.string().default(value));
const defaultedUrl = (value: string) => z.preprocess(emptyToUndefined, z.string().url().default(value));

const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: defaultedUrl("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: optionalUrl(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalString(),
  SUPABASE_SERVICE_ROLE_KEY: optionalString(),
  SUPABASE_JWT_SECRET: defaultedString("development-secret-change-me"),
  OPENAI_API_KEY: optionalString(),
  OPENAI_BASE_URL: defaultedUrl("https://api.openai.com/v1"),
  OPENAI_SITE_URL: optionalUrl(),
  OPENAI_APP_NAME: defaultedString("cent"),
  OPENAI_MODEL_ROUTER: defaultedString("gpt-4o-mini"),
  OPENAI_MODEL_EXTRACTOR: defaultedString("gpt-4o-mini"),
  OPENAI_MODEL_SQL: defaultedString("gpt-4o"),
  OPENAI_MODEL_CHAT: defaultedString("gpt-4o-mini"),
  STT_API_KEY: optionalString(),
  STT_BASE_URL: defaultedUrl("https://api.openai.com/v1"),
  STT_MODEL: defaultedString("whisper-1"),
  STT_AUDIO_FORMAT: defaultedString("ogg"),
  WHATSAPP_PROVIDER: z.enum(["meta", "kapso"]).default("kapso"),
  WHATSAPP_VERIFY_TOKEN: optionalString(),
  WHATSAPP_APP_SECRET: optionalString(),
  WHATSAPP_API_VERSION: defaultedString("v24.0"),
  WHATSAPP_PHONE_NUMBER_ID: optionalString(),
  WHATSAPP_ACCESS_TOKEN: optionalString(),
  KAPSO_API_KEY: optionalString(),
  KAPSO_WEBHOOK_SECRET: optionalString(),
  KAPSO_BASE_URL: defaultedUrl("https://api.kapso.ai"),
  CRON_SECRET: optionalString(),
  SENTRY_DSN: optionalString(),
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
