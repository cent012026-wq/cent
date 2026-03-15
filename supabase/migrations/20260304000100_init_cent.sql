create extension if not exists pgcrypto;

create schema if not exists app;

create or replace function app.current_negocio_id()
returns uuid
language sql
stable
as $$
  select nullif((current_setting('request.jwt.claims', true)::json ->> 'negocio_id'), '')::uuid;
$$;

create or replace function app.current_usuario_id()
returns uuid
language sql
stable
as $$
  select nullif((current_setting('request.jwt.claims', true)::json ->> 'sub'), '')::uuid;
$$;

create or replace function app.current_rol()
returns text
language sql
stable
as $$
  select current_setting('request.jwt.claims', true)::json ->> 'rol';
$$;

create table if not exists public.negocios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  nicho text,
  contexto_ia text,
  config_agente jsonb not null default '{}'::jsonb,
  plan text not null default 'trial' check (plan in ('trial', 'pro', 'business', 'frozen')),
  trial_expires_at timestamptz,
  timezone text not null default 'America/Bogota',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.usuarios (
  id uuid primary key default gen_random_uuid(),
  telefono text unique not null,
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  rol text not null check (rol in ('dueno', 'vendedor')),
  nombre text,
  activo boolean not null default true,
  puede_registrar_costos boolean not null default true,
  codigo_otp text,
  otp_expira timestamptz,
  otp_intentos integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_usuarios_negocio_id on public.usuarios(negocio_id);
create index if not exists idx_usuarios_telefono on public.usuarios(telefono);

create table if not exists public.atributos_negocio (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  nombre_campo text not null,
  tipo_dato text not null default 'text' check (tipo_dato in ('text', 'number', 'select', 'boolean')),
  opciones jsonb,
  es_core boolean not null default false,
  es_obligatorio boolean not null default true,
  orden integer,
  created_at timestamptz not null default now(),
  unique (negocio_id, nombre_campo)
);

create index if not exists idx_atributos_negocio_id on public.atributos_negocio(negocio_id);

create table if not exists public.transacciones (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  usuario_id uuid not null references public.usuarios(id) on delete restrict,
  tipo text not null check (tipo in ('venta', 'costo')),
  concepto text not null,
  monto numeric(12,2) not null check (monto > 0),
  cantidad integer not null default 1 check (cantidad > 0),
  detalles jsonb not null default '{}'::jsonb,
  comprobante_url text,
  mensaje_original text,
  message_id text,
  created_at timestamptz not null default now(),
  unique (message_id)
);

create index if not exists idx_transacciones_negocio_created_at on public.transacciones(negocio_id, created_at desc);
create index if not exists idx_transacciones_usuario_id on public.transacciones(usuario_id);
create index if not exists idx_transacciones_tipo on public.transacciones(tipo);

create table if not exists public.alertas (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  nombre text not null,
  condicion jsonb not null,
  objetivo_numerico numeric,
  progreso_actual numeric not null default 0,
  activa boolean not null default true,
  notificada boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_alertas_negocio_id on public.alertas(negocio_id);
create index if not exists idx_alertas_activas on public.alertas(negocio_id, activa);

create table if not exists public.conversaciones_contexto (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null unique references public.usuarios(id) on delete cascade,
  mensajes jsonb not null default '[]'::jsonb,
  intent_pendiente text,
  datos_parciales jsonb,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_conversaciones_expires_at on public.conversaciones_contexto(expires_at);

create table if not exists public.notificaciones_config (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  tipo text not null check (tipo in ('venta_realtime', 'costo_realtime', 'resumen_diario', 'resumen_semanal', 'resumen_mensual')),
  activa boolean not null default true,
  hora_envio time,
  filtros jsonb,
  ultima_ejecucion timestamptz,
  created_at timestamptz not null default now(),
  unique (negocio_id, tipo)
);

create index if not exists idx_notificaciones_negocio_id on public.notificaciones_config(negocio_id);

create table if not exists public.inbound_messages (
  id uuid primary key default gen_random_uuid(),
  message_id text not null unique,
  telefono text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.outbound_messages (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid references public.negocios(id) on delete set null,
  telefono text not null,
  tipo text not null,
  payload jsonb not null,
  estado text not null check (estado in ('sent', 'failed')),
  error text,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_negocios_updated_at on public.negocios;
create trigger trg_negocios_updated_at
before update on public.negocios
for each row execute function public.set_updated_at();

drop trigger if exists trg_conversaciones_updated_at on public.conversaciones_contexto;
create trigger trg_conversaciones_updated_at
before update on public.conversaciones_contexto
for each row execute function public.set_updated_at();

alter table public.negocios enable row level security;
alter table public.usuarios enable row level security;
alter table public.atributos_negocio enable row level security;
alter table public.transacciones enable row level security;
alter table public.alertas enable row level security;
alter table public.conversaciones_contexto enable row level security;
alter table public.notificaciones_config enable row level security;

-- negocios
create policy negocios_select_by_negocio
on public.negocios
for select
using (id = app.current_negocio_id());

create policy negocios_update_by_owner
on public.negocios
for update
using (id = app.current_negocio_id() and app.current_rol() = 'dueno')
with check (id = app.current_negocio_id() and app.current_rol() = 'dueno');

-- usuarios
create policy usuarios_select_same_negocio
on public.usuarios
for select
using (negocio_id = app.current_negocio_id());

create policy usuarios_insert_owner
on public.usuarios
for insert
with check (negocio_id = app.current_negocio_id() and app.current_rol() = 'dueno');

create policy usuarios_update_owner
on public.usuarios
for update
using (negocio_id = app.current_negocio_id() and app.current_rol() = 'dueno')
with check (negocio_id = app.current_negocio_id() and app.current_rol() = 'dueno');

-- atributos
create policy atributos_select_same_negocio
on public.atributos_negocio
for select
using (negocio_id = app.current_negocio_id());

create policy atributos_mutate_owner
on public.atributos_negocio
for all
using (negocio_id = app.current_negocio_id() and app.current_rol() = 'dueno')
with check (negocio_id = app.current_negocio_id() and app.current_rol() = 'dueno');

-- transacciones
create policy transacciones_select_owner
on public.transacciones
for select
using (negocio_id = app.current_negocio_id() and app.current_rol() = 'dueno');

create policy transacciones_select_vendedor_self
on public.transacciones
for select
using (
  negocio_id = app.current_negocio_id()
  and app.current_rol() = 'vendedor'
  and usuario_id = app.current_usuario_id()
);

create policy transacciones_insert_same_negocio
on public.transacciones
for insert
with check (
  negocio_id = app.current_negocio_id()
  and (
    app.current_rol() = 'dueno'
    or (app.current_rol() = 'vendedor' and usuario_id = app.current_usuario_id())
  )
);

create policy transacciones_update_owner
on public.transacciones
for update
using (negocio_id = app.current_negocio_id() and app.current_rol() = 'dueno')
with check (negocio_id = app.current_negocio_id() and app.current_rol() = 'dueno');

create policy transacciones_delete_owner
on public.transacciones
for delete
using (negocio_id = app.current_negocio_id() and app.current_rol() = 'dueno');

-- alertas
create policy alertas_select_same_negocio
on public.alertas
for select
using (negocio_id = app.current_negocio_id());

create policy alertas_mutate_owner
on public.alertas
for all
using (negocio_id = app.current_negocio_id() and app.current_rol() = 'dueno')
with check (negocio_id = app.current_negocio_id() and app.current_rol() = 'dueno');

-- conversaciones
create policy conversaciones_select_same_negocio
on public.conversaciones_contexto
for select
using (
  exists (
    select 1
    from public.usuarios u
    where u.id = conversaciones_contexto.usuario_id
      and u.negocio_id = app.current_negocio_id()
  )
);

create policy conversaciones_mutate_same_negocio
on public.conversaciones_contexto
for all
using (
  exists (
    select 1
    from public.usuarios u
    where u.id = conversaciones_contexto.usuario_id
      and u.negocio_id = app.current_negocio_id()
  )
)
with check (
  exists (
    select 1
    from public.usuarios u
    where u.id = conversaciones_contexto.usuario_id
      and u.negocio_id = app.current_negocio_id()
  )
);

-- notificaciones
create policy notificaciones_select_same_negocio
on public.notificaciones_config
for select
using (negocio_id = app.current_negocio_id());

create policy notificaciones_mutate_owner
on public.notificaciones_config
for all
using (negocio_id = app.current_negocio_id() and app.current_rol() = 'dueno')
with check (negocio_id = app.current_negocio_id() and app.current_rol() = 'dueno');
