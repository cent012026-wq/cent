"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { Alerta } from "@/lib/domain/types";

const operators = [">=", ">", "<=", "<", "="] as const;
const fields = ["monto", "cantidad"] as const;

export function AlertsManagerClient({ initialAlerts }: { initialAlerts: Alerta[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [campo, setCampo] = useState<(typeof fields)[number]>("monto");
  const [operador, setOperador] = useState<(typeof operators)[number]>(">=");
  const [valor, setValor] = useState("");
  const [objetivo, setObjetivo] = useState("");

  const activeCount = useMemo(() => initialAlerts.filter((alert) => alert.activa).length, [initialAlerts]);

  async function createAlert() {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/alertas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          condicion: {
            campo,
            operador,
            valor: Number(valor),
            acumulador: "SUM",
          },
          objetivo_numerico: objetivo ? Number(objetivo) : undefined,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudo crear la alerta");
      }

      setOpen(false);
      setNombre("");
      setCampo("monto");
      setOperador(">=");
      setValor("");
      setObjetivo("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setSaving(false);
    }
  }

  async function toggleAlert(alerta: Alerta) {
    setTogglingId(alerta.id);
    setError(null);

    try {
      const response = await fetch(`/api/alertas/${alerta.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activa: !alerta.activa }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudo actualizar la alerta");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setTogglingId(null);
    }
  }

  const canCreate = nombre.trim().length >= 3 && Number(valor) > 0;

  return (
    <>
      <section className="grid gap-5 md:grid-cols-3">
        <article className="glass-panel stat-card rounded-[2.2rem]">
          <p className="text-sm font-semibold text-slate-500">Alertas activas</p>
          <p className="mt-4 text-4xl font-bold text-[var(--brand-ink)]">{activeCount}</p>
          <p className="mt-3 text-sm text-slate-500">Reglas monitoreando el negocio</p>
        </article>
        <article className="glass-panel stat-card rounded-[2.2rem]">
          <p className="text-sm font-semibold text-slate-500">Total configuradas</p>
          <p className="mt-4 text-4xl font-bold text-[var(--brand-ink)]">{initialAlerts.length}</p>
          <p className="mt-3 text-sm text-slate-500">Incluye activas y pausadas</p>
        </article>
        <article className="glass-panel stat-card rounded-[2.2rem]">
          <p className="text-sm font-semibold text-slate-500">Notificadas</p>
          <p className="mt-4 text-4xl font-bold text-[var(--brand-ink)]">{initialAlerts.filter((alert) => alert.notificada).length}</p>
          <p className="mt-3 text-sm text-slate-500">Reglas que ya dispararon aviso</p>
        </article>
      </section>

      <section className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--brand-ink)]">Reglas del negocio</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">Activa umbrales y metas sin salir del panel.</p>
        </div>
        <button type="button" className="button-primary px-6 py-3 text-sm" onClick={() => setOpen(true)}>
          Nueva alerta
        </button>
      </section>

      {error ? <p className="mt-4 rounded-[1.25rem] bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">{error}</p> : null}

      <section className="mt-6 grid gap-5 xl:grid-cols-2">
        {initialAlerts.length === 0 ? (
          <article className="glass-panel rounded-[2.4rem] p-10 xl:col-span-2">
            <h2 className="text-2xl font-bold text-[var(--brand-ink)]">Todavía no hay alertas creadas</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">Crea una regla para monitorear montos o cantidades y recibir avisos cuando se cumplan.</p>
          </article>
        ) : (
          initialAlerts.map((alert) => {
            const progress = alert.objetivo_numerico
              ? Math.max(0, Math.min(100, Math.round((Number(alert.progreso_actual) / Number(alert.objetivo_numerico)) * 100)))
              : 0;

            return (
              <article key={alert.id} className="glass-panel rounded-[2.4rem] p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-2xl font-bold text-[var(--brand-ink)]">{alert.nombre}</p>
                    <p className="mt-2 text-sm text-slate-500">
                      {String((alert.condicion as { campo?: string }).campo ?? "monto")} {String((alert.condicion as { operador?: string }).operador ?? ">=")} {String((alert.condicion as { valor?: number }).valor ?? 0)}
                    </p>
                  </div>
                  <span className={`metric-pill ${alert.activa ? "metric-pill-positive" : "metric-pill-neutral"}`}>
                    {alert.activa ? "Activa" : "Pausada"}
                  </span>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="rounded-[1.5rem] bg-white/55 p-4 text-sm text-slate-600">
                    Progreso: <strong className="text-[var(--brand-ink)]">{Number(alert.progreso_actual)}</strong> / {alert.objetivo_numerico ?? "Sin objetivo"}
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      <span>avance</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="progress-rail">
                      <div className="progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`metric-pill ${alert.notificada ? "metric-pill-neutral" : "metric-pill-positive"}`}>
                      {alert.notificada ? "Ya notificada" : "Pendiente"}
                    </span>
                    <button
                      type="button"
                      onClick={() => void toggleAlert(alert)}
                      disabled={togglingId === alert.id}
                      className="button-secondary px-4 py-2 text-xs"
                    >
                      {alert.activa ? "Pausar" : "Reactivar"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>

      {open ? (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/25 p-4 backdrop-blur-sm">
          <div className="glass-panel-strong w-full max-w-lg rounded-[2rem] p-6 shadow-2xl shadow-slate-900/10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Alertas</p>
                <h3 className="mt-2 text-2xl font-bold text-[var(--brand-ink)]">Nueva alerta</h3>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full p-2 text-slate-400 transition hover:bg-white/60 hover:text-slate-700">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              </button>
            </div>

            <form
              className="mt-6 grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                void createAlert();
              }}
            >
              <div>
                <label className="mb-2 ml-1 block text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Nombre</label>
                <input value={nombre} onChange={(event) => setNombre(event.target.value)} className="w-full rounded-[1.2rem] border border-white/60 bg-white/65 px-4 py-3 text-sm text-slate-700 outline-none" placeholder="Meta diaria de ventas" />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <select value={campo} onChange={(event) => setCampo(event.target.value as (typeof fields)[number])} className="rounded-[1.2rem] border border-white/60 bg-white/65 px-4 py-3 text-sm text-slate-700 outline-none">
                  {fields.map((field) => (
                    <option key={field} value={field}>
                      {field}
                    </option>
                  ))}
                </select>
                <select value={operador} onChange={(event) => setOperador(event.target.value as (typeof operators)[number])} className="rounded-[1.2rem] border border-white/60 bg-white/65 px-4 py-3 text-sm text-slate-700 outline-none">
                  {operators.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                <input value={valor} onChange={(event) => setValor(event.target.value)} className="rounded-[1.2rem] border border-white/60 bg-white/65 px-4 py-3 text-sm text-slate-700 outline-none" placeholder="100000" />
              </div>
              <div>
                <label className="mb-2 ml-1 block text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Objetivo (opcional)</label>
                <input value={objetivo} onChange={(event) => setObjetivo(event.target.value)} className="w-full rounded-[1.2rem] border border-white/60 bg-white/65 px-4 py-3 text-sm text-slate-700 outline-none" placeholder="500000" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="button-secondary px-5 py-3 text-sm">
                  Cancelar
                </button>
                <button type="submit" disabled={saving || !canCreate} className="button-primary px-5 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60">
                  {saving ? "Guardando..." : "Crear alerta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
