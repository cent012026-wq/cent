# Conversation State System Brief

## Context

`cent` is a WhatsApp-first operating system for small businesses. Users interact with the product by sending text notes and voice notes over WhatsApp to:

- register sales
- register costs
- ask for metrics
- onboard a new business
- receive prompts for missing transaction data

The current implementation has working pieces, but the conversation layer is still too implicit. State is spread across webhook parsing, heuristic intent extraction, `conversaciones_contexto`, and transaction handlers.

This document explains the current behavior, the incident we hit in production, and the requirements for designing a durable conversation-state system.

## Current architecture

Relevant files:

- [/Users/juandavidvizcaya/Desktop/cent/cent/src/app/api/webhook/whatsapp/route.ts](/Users/juandavidvizcaya/Desktop/cent/cent/src/app/api/webhook/whatsapp/route.ts)
- [/Users/juandavidvizcaya/Desktop/cent/cent/src/lib/whatsapp/webhook.ts](/Users/juandavidvizcaya/Desktop/cent/cent/src/lib/whatsapp/webhook.ts)
- [/Users/juandavidvizcaya/Desktop/cent/cent/src/lib/services/inbound-whatsapp.ts](/Users/juandavidvizcaya/Desktop/cent/cent/src/lib/services/inbound-whatsapp.ts)
- [/Users/juandavidvizcaya/Desktop/cent/cent/src/lib/services/transactions.ts](/Users/juandavidvizcaya/Desktop/cent/cent/src/lib/services/transactions.ts)
- [/Users/juandavidvizcaya/Desktop/cent/cent/src/lib/services/context.ts](/Users/juandavidvizcaya/Desktop/cent/cent/src/lib/services/context.ts)
- [/Users/juandavidvizcaya/Desktop/cent/cent/src/lib/services/data-access.ts](/Users/juandavidvizcaya/Desktop/cent/cent/src/lib/services/data-access.ts)
- [/Users/juandavidvizcaya/Desktop/cent/cent/supabase/migrations/20260304000100_init_cent.sql](/Users/juandavidvizcaya/Desktop/cent/cent/supabase/migrations/20260304000100_init_cent.sql)

Current persisted state:

- `usuarios`
- `negocios`
- `transacciones`
- `conversaciones_contexto`
- `inbound_messages`
- `outbound_messages`

## Production incident we hit

### What happened

The webhook was subscribed to multiple WhatsApp events, including:

- `whatsapp.message.received`
- `whatsapp.message.sent`
- `whatsapp.message.delivered`
- `whatsapp.message.read`
- `whatsapp.message.failed`

The backend incorrectly treated some outbound/status payloads as inbound user messages.

That created a self-reply loop:

1. Bot sends a message to a user.
2. Kapso emits a webhook for an outbound-related event.
3. Backend parses it as if it came from the user.
4. Backend replies again.
5. Repeat.

### Why it got worse

For a seller with a pending transaction context, the bot prompt itself was treated as the seller reply. Example:

- pending state expected missing field: `monto`
- bot sends: `Me falta un dato obligatorio: monto. ¿Me lo compartes?`
- webhook re-ingests that outbound
- state machine treats it as the seller answer
- validation fails
- bot sends another fallback text
- same loop continues

### Observed effects

- message spam to the same phone number
- WhatsApp pair rate limit errors
- polluted `inbound_messages`
- polluted `outbound_messages`
- at least one bogus transaction created from the bot reading its own confirmation text

## Core design problem

The current system is intent-driven, but not state-driven.

It can answer simple cases, but it does not explicitly model:

- whether a message is user-originated vs bot-originated
- whether a conversation is idle vs collecting missing fields
- whether the system is in onboarding vs transaction capture
- whether a pending state can accept arbitrary text
- whether a reply belongs to a live user turn or is an echo/status artifact

## Objective for the new system

Design a proper conversation state machine for WhatsApp business operations.

The design must be:

- explicit
- idempotent
- event-safe
- resilient to webhook noise
- role-aware (`dueno` vs `vendedor`)
- compatible with text and audio inputs

## Non-negotiable invariants

1. Only true inbound user messages can advance a conversation.
2. Outbound/status events must never mutate business workflow state.
3. Every conversation transition must be explainable from persisted state.
4. A single inbound event must be idempotent by `message_id`.
5. A pending field-collection state must validate that the next message semantically answers the missing field, not just store arbitrary text blindly.
6. A bot message can never be re-consumed as user input.
7. Transaction creation must be atomic and auditable.

## Recommended state model

Use a top-level conversation state enum, persisted explicitly.

Suggested states:

- `idle`
- `awaiting_onboarding_audio`
- `processing_onboarding`
- `awaiting_transaction_field`
- `processing_transaction`
- `awaiting_confirmation`
- `awaiting_metric_scope`
- `completed`
- `blocked`

Suggested subtypes or metadata:

- `intent`: `registrar_venta | registrar_costo | consultar_metricas | onboarding | ayuda | alertas`
- `expected_field`: `monto | concepto | cantidad | atributo_x`
- `source_message_id`
- `last_user_message_at`
- `last_bot_message_at`
- `expires_at`
- `retry_count`
- `validation_errors`

## Recommended persistence shape

`conversaciones_contexto` today is too free-form.

Suggested persisted structure:

```ts
type ConversationState =
  | "idle"
  | "awaiting_onboarding_audio"
  | "processing_onboarding"
  | "awaiting_transaction_field"
  | "processing_transaction"
  | "awaiting_metric_scope"
  | "completed"
  | "blocked";

interface ConversationContextV2 {
  id: string;
  usuario_id: string;
  negocio_id: string;
  state: ConversationState;
  intent: "registrar_venta" | "registrar_costo" | "consultar_metricas" | "onboarding" | null;
  expected_field: string | null;
  collected_data: Record<string, unknown>;
  last_user_message_id: string | null;
  last_bot_message_id: string | null;
  last_user_message_at: string | null;
  last_bot_message_at: string | null;
  last_inbound_direction: "inbound" | null;
  status_reason: string | null;
  expires_at: string;
  updated_at: string;
}
```

## Required event classification layer

Before entering the conversation state machine, every webhook payload must be normalized into an internal event.

Suggested normalized event model:

```ts
type NormalizedWebhookEvent =
  | { kind: "user_message"; messageId: string; phone: string; text?: string; audioUrl?: string; transcript?: string; timestamp: string }
  | { kind: "outbound_status"; messageId: string; status: "sent" | "delivered" | "read" | "failed"; timestamp: string }
  | { kind: "conversation_status"; status: "created" | "inactive" | "ended"; phone: string; timestamp: string }
  | { kind: "unknown"; raw: unknown };
```

The state machine should consume only `kind: "user_message"`.

## Required transition rules

### `idle`

Input:

- known owner/seller text
- known owner/seller audio
- unknown number text/audio

Transitions:

- unknown text -> `awaiting_onboarding_audio`
- unknown audio -> `processing_onboarding`
- known sale/cost with full data -> `processing_transaction`
- known sale/cost with missing data -> `awaiting_transaction_field`
- known metrics question -> resolve and remain `idle`

### `awaiting_onboarding_audio`

Input:

- audio -> `processing_onboarding`
- text -> remain in state and reprompt for audio or allow explicit text onboarding flow

### `processing_onboarding`

Input:

- no new transitions until completion/failure

Transitions:

- success -> `completed` then `idle`
- failure -> `awaiting_onboarding_audio`

### `awaiting_transaction_field`

Input:

- only inbound user message from the same user

Rules:

- validate reply against `expected_field`
- if valid and more fields missing -> remain `awaiting_transaction_field` with next field
- if valid and all fields present -> `processing_transaction`
- if invalid -> stay in state and reply with a targeted prompt

### `processing_transaction`

Transitions:

- success -> `completed` then `idle`
- validation failure -> `awaiting_transaction_field`
- permanent failure -> `blocked`

## Validation requirements

The current `mergePendingWithUserReply()` just assigns raw text to the next missing field. That is not enough.

The new system needs field-aware validators, for example:

- `monto`: parse currency and reject unrelated prose
- `cantidad`: numeric extraction only
- `concepto`: non-empty noun phrase
- custom attributes: type-driven validation

This should be modeled as:

```ts
type FieldValidator = (text: string) => { ok: true; value: unknown } | { ok: false; reason: string };
```

## Loop prevention rules

These are mandatory:

1. Ignore every webhook event whose top-level event is not `whatsapp.message.received`.
2. Ignore every payload whose direction is `outbound`.
3. Ignore every message ID that already exists in `inbound_messages`.
4. Optionally store `last_bot_message_id` and refuse to process it as inbound even if received again.
5. Consider narrowing Kapso subscription to only `whatsapp.message.received`.

## Audio handling requirements

Audio should not bypass the same state system.

Flow:

1. normalize event
2. transcribe
3. derive textual meaning
4. route through same state transitions as text

Do not create a separate implicit flow for audio that skips state validation.

## Role rules

The state machine must be role-aware:

- `dueno`
  - can register sales
  - can register costs
  - can ask global metrics
  - can manage alerts conceptually

- `vendedor`
  - can register sales
  - can register costs only if allowed
  - can only access own metrics scope

Role restrictions must be enforced before state transitions that mutate data.

## Idempotency requirements

Every inbound processing step must be safe under duplicate delivery.

Suggested idempotency keys:

- `inbound_messages.message_id`
- `transacciones.message_id`
- `outbound_messages` may also keep provider message IDs if available

If the same inbound message is delivered twice:

- it must not create two transactions
- it must not advance state twice
- it must not send duplicate replies

## Recommended implementation approach

Do not keep patching isolated handlers.

Instead:

1. Introduce a formal `ConversationEngine`.
2. Feed it only normalized inbound-user events.
3. Make it return explicit commands:

```ts
type ConversationCommand =
  | { type: "send_text"; to: string; body: string }
  | { type: "create_transaction"; payload: ... }
  | { type: "update_context"; payload: ... }
  | { type: "clear_context"; usuarioId: string }
  | { type: "noop"; reason: string };
```

4. Execute commands in a transaction-safe application layer.

## Minimum acceptance criteria

The new state system is not done until all these pass:

1. A seller sends `Vendi 3 camisas` -> bot asks only for `monto`.
2. Seller replies `75 mil` -> sale is created exactly once.
3. A bot outbound confirmation never re-enters as inbound.
4. `message.sent`, `message.delivered`, `message.read`, `message.failed` never mutate conversation state.
5. Unknown number text -> onboarding prompt.
6. Unknown number audio -> onboarding flow.
7. Duplicate webhook delivery does not duplicate reply or transaction.

## Immediate practical note

At the time this brief was written:

- the webhook was temporarily disabled in Kapso to stop the production loop
- production code had already started moving toward:
  - faster heuristics
  - inline webhook processing
  - outbound echo filtering

But the long-term fix is still a formal state machine, not more conditionals.
