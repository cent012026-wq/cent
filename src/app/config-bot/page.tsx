import { AppShell } from "@/components/app-shell";
import { requireOwnerPageSession } from "@/lib/auth/page-session";
import { isSupabaseConfigured } from "@/lib/db/admin";
import { findNegocioById } from "@/lib/services/data-access";

export default async function ConfigBotPage() {
  const session = await requireOwnerPageSession();

  if (!isSupabaseConfigured()) {
    return (
      <AppShell title="Config bot" subtitle="Ajusta la identidad del asistente." telefono={session.telefono}>
        <p className="glass-panel rounded-[2rem] border border-amber-200 bg-amber-50 px-5 py-4 text-amber-700">
          Configura Supabase para personalizar el bot.
        </p>
      </AppShell>
    );
  }

  const negocio = await findNegocioById(session.negocioId);

  return (
    <AppShell
      title="Config bot"
      subtitle="Nombre, tono y lenguaje con el que responde el asistente."
      telefono={session.telefono}
    >
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="glass-panel-strong rounded-[2.6rem] p-6 md:p-8">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 ml-1 block text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Negocio</label>
              <div className="rounded-[1.35rem] border border-white/60 bg-white/65 px-5 py-4 text-base font-semibold text-[var(--brand-ink)]">
                {negocio?.nombre ?? "Sin negocio"}
              </div>
            </div>
            <div>
              <label className="mb-2 ml-1 block text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Plan</label>
              <div className="rounded-[1.35rem] border border-white/60 bg-white/65 px-5 py-4 text-base font-semibold capitalize text-[var(--brand-ink)]">
                {negocio?.plan ?? "trial"}
              </div>
            </div>
            <div>
              <label className="mb-2 ml-1 block text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Nombre del agente</label>
              <div className="rounded-[1.35rem] border border-white/60 bg-white/65 px-5 py-4 text-base text-slate-700">
                {negocio?.config_agente?.nombre ?? "VendBot"}
              </div>
            </div>
            <div>
              <label className="mb-2 ml-1 block text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Tono</label>
              <div className="rounded-[1.35rem] border border-white/60 bg-white/65 px-5 py-4 text-base text-slate-700">
                {negocio?.config_agente?.tono ?? "amable"}
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 ml-1 block text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Jerga</label>
              <div className="rounded-[1.35rem] border border-white/60 bg-white/65 px-5 py-4 text-base text-slate-700">
                {negocio?.config_agente?.jerga ?? "neutro"}
              </div>
            </div>
          </div>
        </article>

        <article className="glass-panel rounded-[2.6rem] p-6 md:p-8">
          <div className="eyebrow">Resumen</div>
          <h2 className="mt-5 text-3xl font-bold text-[var(--brand-ink)]">Estado actual del asistente</h2>
          <div className="mt-6 space-y-4 text-sm leading-7 text-slate-600">
            <div className="rounded-[1.5rem] bg-white/55 p-4">El nombre del agente define cómo se presenta ante el equipo y el dueño.</div>
            <div className="rounded-[1.5rem] bg-white/55 p-4">El tono controla si la respuesta se siente más formal, cercana o neutra.</div>
            <div className="rounded-[1.5rem] bg-white/55 p-4">La jerga ayuda a mantener consistencia con el lenguaje del negocio.</div>
          </div>
        </article>
      </section>
    </AppShell>
  );
}
