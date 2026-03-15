"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function BotConfigClient({
  initialNombre,
  initialTono,
  initialJerga,
  negocioNombre,
  plan,
}: {
  initialNombre: string;
  initialTono: string;
  initialJerga: string;
  negocioNombre: string;
  plan: string;
}) {
  const router = useRouter();
  const [nombre, setNombre] = useState(initialNombre);
  const [tono, setTono] = useState(initialTono);
  const [jerga, setJerga] = useState(initialJerga);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function saveConfig() {
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const response = await fetch("/api/config-bot", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, tono, jerga }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudo guardar la configuración");
      }

      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <article className="glass-panel-strong rounded-[2.6rem] p-6 md:p-8">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 ml-1 block text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Negocio</label>
            <div className="rounded-[1.35rem] border border-white/60 bg-white/65 px-5 py-4 text-base font-semibold text-[var(--brand-ink)]">
              {negocioNombre}
            </div>
          </div>
          <div>
            <label className="mb-2 ml-1 block text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Plan</label>
            <div className="rounded-[1.35rem] border border-white/60 bg-white/65 px-5 py-4 text-base font-semibold capitalize text-[var(--brand-ink)]">
              {plan}
            </div>
          </div>
          <div>
            <label className="mb-2 ml-1 block text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Nombre del agente</label>
            <input value={nombre} onChange={(event) => setNombre(event.target.value)} className="w-full rounded-[1.35rem] border border-white/60 bg-white/65 px-5 py-4 text-base text-slate-700 outline-none" />
          </div>
          <div>
            <label className="mb-2 ml-1 block text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Tono</label>
            <input value={tono} onChange={(event) => setTono(event.target.value)} className="w-full rounded-[1.35rem] border border-white/60 bg-white/65 px-5 py-4 text-base text-slate-700 outline-none" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 ml-1 block text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Jerga</label>
            <input value={jerga} onChange={(event) => setJerga(event.target.value)} className="w-full rounded-[1.35rem] border border-white/60 bg-white/65 px-5 py-4 text-base text-slate-700 outline-none" />
          </div>
        </div>

        {error ? <p className="mt-5 rounded-[1.25rem] bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">{error}</p> : null}
        {saved ? <p className="mt-5 rounded-[1.25rem] bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">Configuración actualizada.</p> : null}

        <div className="mt-6 flex justify-end">
          <button type="button" onClick={() => void saveConfig()} disabled={saving || nombre.trim().length < 2 || tono.trim().length < 2 || jerga.trim().length < 2} className="button-primary px-6 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60">
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </article>

      <article className="glass-panel rounded-[2.6rem] p-6 md:p-8">
        <div className="eyebrow">Vista previa</div>
        <h2 className="mt-5 text-3xl font-bold text-[var(--brand-ink)]">Cómo se presentará el asistente</h2>
        <div className="mt-6 space-y-4 text-sm leading-7 text-slate-600">
          <div className="rounded-[1.5rem] bg-white/55 p-4">
            <p className="font-semibold text-[var(--brand-ink)]">Nombre</p>
            <p className="mt-2">{nombre || "Sin nombre"}</p>
          </div>
          <div className="rounded-[1.5rem] bg-white/55 p-4">
            <p className="font-semibold text-[var(--brand-ink)]">Tono</p>
            <p className="mt-2">{tono || "Sin tono definido"}</p>
          </div>
          <div className="rounded-[1.5rem] bg-white/55 p-4">
            <p className="font-semibold text-[var(--brand-ink)]">Jerga</p>
            <p className="mt-2">{jerga || "Sin jerga definida"}</p>
          </div>
        </div>
      </article>
    </section>
  );
}
