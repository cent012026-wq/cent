# cent V1

SaaS de gestión de ventas y gastos por WhatsApp con panel web administrativo.

Stack actual del proyecto:

- Next.js (App Router)
- Supabase (PostgreSQL + RLS)
- OpenRouter para LLM (`z-ai/glm-5`) + OpenAI Whisper para audio a texto
- WhatsApp via Kapso (por defecto)

## 1. Prerrequisitos

Instala y verifica:

1. Node.js 20+
2. npm 10+
3. Cuenta de Supabase
4. Cuenta de Kapso con número de WhatsApp activo
5. Clave de OpenRouter para LLM
6. Clave de OpenAI para Whisper

Verificación rápida:

```bash
node -v
npm -v
```

## 2. Clonar e instalar

```bash
git clone <tu-repo>
cd cent
npm install
```

## 3. Variables de entorno

Copia plantilla:

```bash
cp .env.example .env.local
```

Variables mínimas para levantar el sistema completo:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`
- `OPENAI_API_KEY`
- `OPENAI_BASE_URL`
- `WHATSAPP_PROVIDER=kapso`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_OTP_TEMPLATE_NAME`
- `WHATSAPP_OTP_TEMPLATE_LANGUAGE`
- `KAPSO_API_KEY`
- `KAPSO_WEBHOOK_SECRET`
- `KAPSO_BASE_URL` (por defecto `https://api.kapso.ai`)
- `WHATSAPP_API_VERSION` (por defecto `v24.0`)
- `CRON_SECRET`

Variables opcionales:

- `SENTRY_DSN`
- `OPENAI_SITE_URL`
- `OPENAI_APP_NAME`
- `OPENAI_MODEL_ROUTER`
- `OPENAI_MODEL_EXTRACTOR`
- `OPENAI_MODEL_SQL`
- `OPENAI_MODEL_CHAT`
- `STT_API_KEY`
- `STT_BASE_URL`
- `STT_MODEL`
- `STT_AUDIO_FORMAT`

Notas importantes:

- Si `WHATSAPP_PROVIDER=kapso`, el backend valida firma con header `x-webhook-signature` y `KAPSO_WEBHOOK_SECRET`.
- El OTP web ahora sale por template de WhatsApp, no por texto libre. Debes tener aprobado `WHATSAPP_OTP_TEMPLATE_NAME` en el idioma configurado por `WHATSAPP_OTP_TEMPLATE_LANGUAGE`.
- Para OpenRouter, usa `OPENAI_BASE_URL=https://openrouter.ai/api/v1`.
- El setup actual de audio usa `STT_BASE_URL=https://api.openai.com/v1` y `STT_MODEL=whisper-1`.
- Para notas de voz de WhatsApp, deja `STT_AUDIO_FORMAT=ogg`.
- Como las notas de voz de WhatsApp suelen venir en `ogg/opus`, el backend las convierte a `wav` antes de enviarlas a Whisper.
- Si quieres operar directo con Meta, cambia a `WHATSAPP_PROVIDER=meta` y completa `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`.

## 4. Base de datos (Supabase)

Aplica la migración principal:

- Archivo: `supabase/migrations/20260304000100_init_cent.sql`

Opciones para aplicarla:

1. SQL Editor (Supabase Dashboard): pega el archivo completo y ejecuta.
2. Supabase CLI: aplica la migración en tu proyecto enlazado.

La migración crea:

- Tablas de dominio: `negocios`, `usuarios`, `atributos_negocio`, `transacciones`, `alertas`, `conversaciones_contexto`, `notificaciones_config`
- Auditoría: `inbound_messages`, `outbound_messages`
- Políticas RLS multi-tenant por `negocio_id`
- Restricciones por rol (`dueno` vs `vendedor`)

## 5. Configurar webhook en Kapso

Configura en Kapso el webhook entrante apuntando a:

- `POST https://<tu-dominio>/api/webhook/whatsapp`

Para local:

1. Ejecuta la app local (`npm run dev`)
2. Expón el puerto 3000 con ngrok/cloudflared
3. Usa la URL pública en Kapso

El endpoint `GET /api/webhook/whatsapp` en modo Kapso responde salud (`{ ok: true, provider: "kapso" }`).

## 6. Ejecutar proyecto

Modo desarrollo:

```bash
npm run dev
```

Build producción:

```bash
npm run build
npm run start
```

## 7. Validación técnica

Ejecuta checks:

```bash
npm run lint
npm run typecheck
npm run test
```

## 8. Flujo funcional esperado (end-to-end)

1. Número nuevo escribe al bot.
2. Bot solicita audio de onboarding.
3. Audio -> transcripción -> creación de `negocio` + `dueno` + atributos iniciales.
4. Dueño solicita OTP en web (`/login`).
5. OTP llega por WhatsApp y abre sesión.
6. Mensajes operativos (`venta`, `costo`, `métricas`) se procesan por webhook.
7. Transacciones disparan evaluación de alertas y notificaciones.

## 9. Prueba manual del webhook (sin Kapso)

Puedes simular un mensaje con cURL:

```bash
curl -X POST http://localhost:3000/api/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -H "x-webhook-signature: sha256=<firma>" \
  -d '{
    "event": "message.received",
    "data": {
      "id": "evt_test_1",
      "from": "573001234567",
      "message_type": "text",
      "message": {
        "id": "wamid.test.1",
        "type": "text",
        "text": { "body": "Vendí 2 camisas a 25 mil" }
      }
    }
  }'
```

Si no quieres validar firma para pruebas locales inmediatas, deja `KAPSO_WEBHOOK_SECRET` vacío temporalmente.

## 10. Endpoints principales

- `GET /api/health`
- `GET /api/webhook/whatsapp`
- `POST /api/webhook/whatsapp`
- `POST /api/auth/request-otp`
- `POST /api/auth/verify-otp`
- `GET /api/dashboard/summary`
- `GET /api/transacciones`
- `POST /api/transacciones`
- `POST /api/alertas`
- `PATCH /api/alertas/:id`
- `POST /api/notificaciones/config`
- `PATCH /api/notificaciones/config/:id`
- `POST /api/cron/notifications`

## 11. Estructura del código

- `src/app/api/*`: API routes
- `src/lib/ai/*`: router IA, schemas y provider OpenAI
- `src/lib/services/*`: lógica de negocio
- `src/lib/whatsapp/*`: adaptación de proveedor (Kapso/Meta)
- `supabase/migrations/*`: SQL y RLS

## 12. Troubleshooting rápido

1. No salen mensajes de WhatsApp.
   - Revisa `KAPSO_API_KEY`, `WHATSAPP_PHONE_NUMBER_ID` y `WHATSAPP_API_VERSION`.

2. Webhook responde 401.
   - Revisa firma y `KAPSO_WEBHOOK_SECRET`.

3. Login OTP no llega.
   - Verifica `WHATSAPP_OTP_TEMPLATE_NAME`, `WHATSAPP_OTP_TEMPLATE_LANGUAGE`, `KAPSO_API_KEY` y `WHATSAPP_PHONE_NUMBER_ID`.

4. Error de permisos de datos.
   - Confirma migración aplicada completa y políticas RLS activas.

5. Sin respuesta de IA.
   - Verifica `OPENAI_API_KEY` y `OPENAI_BASE_URL`; sin clave usa fallback heurístico limitado.

6. Los audios no se procesan.
   - Si Kapso no manda `transcript`, verifica `STT_API_KEY`, `STT_MODEL=whisper-1` y que el deploy incluya `ffmpeg-static`.
