"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { NotificacionConfig, NotificacionTipo } from "@/lib/domain/types";

const notificationCatalog: Array<{ tipo: NotificacionTipo; label: string; defaultTime: string | null }> = [
  { tipo: "venta_realtime", label: "Venta en tiempo real", defaultTime: null },
  { tipo: "costo_realtime", label: "Costo en tiempo real", defaultTime: null },
  { tipo: "resumen_diario", label: "Resumen diario", defaultTime: "18:00" },
  { tipo: "resumen_semanal", label: "Resumen semanal", defaultTime: "18:00" },
  { tipo: "resumen_mensual", label: "Resumen mensual", defaultTime: "18:00" },
];

export function NotificationsManagerClient({ initialConfigs }: { initialConfigs: NotificacionConfig[] }) {
  const router = useRouter();
  const [savingTipo, setSavingTipo] = useState<NotificacionTipo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const configMap = useMemo(
    () =>
      new Map(initialConfigs.map((config) => [config.tipo, config])),
    [initialConfigs],
  );

  async function saveNotification(input: {
    tipo: NotificacionTipo;
    activa: boolean;
    hora_envio: string | null;
  }) {
    setSavingTipo(input.tipo);
    setError(null);

    try {
      const existing = configMap.get(input.tipo);
      const url = existing ? `/api/notificaciones/config/${existing.id}` : "/api/notificaciones/config";
      const method = existing ? "PATCH" : "POST";
      const body = existing
        ? {
            activa: input.activa,
            hora_envio: input.hora_envio,
          }
        : {
            tipo: input.tipo,
            activa: input.activa,
            hora_envio: input.hora_envio ?? undefined,
          };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudo guardar la notificación");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setSavingTipo(null);
    }
  }

  return (
    <>
      <section className="grid gap-5 md:grid-cols-3">
        <article className="glass-panel stat-card rounded-[2.2rem]">
          <p className="text-sm font-semibold text-slate-500">Configuradas</p>
          <p className="mt-4 text-4xl font-bold text-[var(--brand-ink)]">{initialConfigs.length}</p>
          <p className="mt-3 text-sm text-slate-500">Tipos con ajustes guardados</p>
        </article>
        <article className="glass-panel stat-card rounded-[2.2rem]">
          <p className="text-sm font-semibold text-slate-500">Activas</p>
          <p className="mt-4 text-4xl font-bold text-[var(--brand-ink)]">{initialConfigs.filter((item) => item.activa).length}</p>
          <p className="mt-3 text-sm text-slate-500">Envíos habilitados</p>
        </article>
        <article className="glass-panel stat-card rounded-[2.2rem]">
          <p className="text-sm font-semibold text-slate-500">Programadas</p>
          <p className="mt-4 text-4xl font-bold text-[var(--brand-ink)]">{initialConfigs.filter((item) => item.hora_envio).length}</p>
          <p className="mt-3 text-sm text-slate-500">Con horario definido</p>
        </article>
      </section>

      {error ? <p className="mt-6 rounded-[1.25rem] bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">{error}</p> : null}

      <section className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {notificationCatalog.map((item) => {
          const config = configMap.get(item.tipo);
          const active = config?.activa ?? false;
          const time = config?.hora_envio ?? item.defaultTime;

          return (
            <article key={item.tipo} className="glass-panel rounded-[2.3rem] p-6">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xl font-bold text-[var(--brand-ink)]">{item.label}</p>
                <span className={`metric-pill ${active ? "metric-pill-positive" : "metric-pill-neutral"}`}>
                  {active ? "Activa" : "Pausada"}
                </span>
              </div>

              <div className="mt-6 space-y-4 text-sm text-slate-600">
                <div className="rounded-[1.4rem] bg-white/55 px-4 py-3">
                  Última ejecución: {config?.ultima_ejecucion ? new Date(config.ultima_ejecucion).toLocaleString("es-CO") : "Sin ejecuciones"}
                </div>

                {item.defaultTime ? (
                  <label className="block">
                    <span className="mb-2 ml-1 block text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Hora</span>
                    <input
                      defaultValue={time ?? ""}
                      type="time"
                      onBlur={(event) =>
                        void saveNotification({
                          tipo: item.tipo,
                          activa: active,
                          hora_envio: event.target.value || null,
                        })
                      }
                      className="w-full rounded-[1.2rem] border border-white/60 bg-white/65 px-4 py-3 text-sm text-slate-700 outline-none"
                    />
                  </label>
                ) : (
                  <div className="rounded-[1.4rem] bg-white/55 px-4 py-3">Se envía inmediatamente cuando ocurre el evento.</div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() =>
                    void saveNotification({
                      tipo: item.tipo,
                      activa: !active,
                      hora_envio: time,
                    })
                  }
                  disabled={savingTipo === item.tipo}
                  className="button-secondary px-4 py-2 text-xs"
                >
                  {savingTipo === item.tipo ? "Guardando..." : active ? "Pausar" : "Activar"}
                </button>
              </div>
            </article>
          );
        })}
      </section>
    </>
  );
}
