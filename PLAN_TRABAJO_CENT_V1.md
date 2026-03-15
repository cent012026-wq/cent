# Plan De Trabajo Estructural: cent V1 (Basado en PRD v1.0)

## Resumen
Construir un producto dual `WhatsApp operativo + Web administrativo` con backend unificado en Next.js/Supabase, IA `OpenAI-first` con adapter multi-proveedor, y control estricto de seguridad por `whitelist + RLS`.

## Decisiones cerradas
- Stack base: Next.js + Supabase + Meta Cloud API.
- IA: OpenAI-first + Adapter Pattern.
- Seguridad: whitelist estricta + RLS + OTP + firma webhook.
- Separación de canal: WhatsApp operativo, Web administrativo.

## Entregable implementado
- Proyecto en `/Users/juandavidvizcaya/Desktop/cent/cent`.
- Migraciones SQL con RLS en `supabase/migrations`.
- Endpoints y panel admin base funcional.
