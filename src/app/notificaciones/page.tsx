import { AppShell } from "@/components/app-shell";
import { requireOwnerPageSession } from "@/lib/auth/page-session";
import { isSupabaseConfigured } from "@/lib/db/admin";
import { listNotificacionConfig } from "@/lib/services/data-access";

export default async function NotificacionesPage() {
  const session = await requireOwnerPageSession();

  if (!isSupabaseConfigured()) {
    return (
      <AppShell title="Notificaciones" subtitle="Controla los envíos automáticos." telefono={session.telefono}>
        <p className="glass-panel rounded-[2rem] border border-amber-200 bg-amber-50 px-5 py-4 text-amber-700">
          Configura Supabase para administrar notificaciones.
        </p>
      </AppShell>
    );
  }

  const configs = await listNotificacionConfig(session.negocioId);

  return (
    <AppShell
      title="Notificaciones"
      subtitle="Resúmenes, avisos y última ejecución por tipo."
      telefono={session.telefono}
    >
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {configs.length === 0 ? (
          <article className="glass-panel rounded-[2.4rem] p-10 md:col-span-2 xl:col-span-3">
            <h2 className="text-2xl font-bold text-[var(--brand-ink)]">No hay notificaciones configuradas</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
              Activa notificaciones cuando quieras enviar resúmenes o avisos desde WhatsApp.
            </p>
          </article>
        ) : (
          configs.map((config) => (
            <article key={config.id} className="glass-panel rounded-[2.3rem] p-6">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xl font-bold capitalize text-[var(--brand-ink)]">{config.tipo.replaceAll("_", " ")}</p>
                <span className={`metric-pill ${config.activa ? "metric-pill-positive" : "metric-pill-neutral"}`}>
                  {config.activa ? "Activa" : "Pausada"}
                </span>
              </div>
              <div className="mt-6 space-y-3 text-sm text-slate-600">
                <div className="rounded-[1.4rem] bg-white/55 px-4 py-3">Hora programada: {config.hora_envio ?? "Sin horario"}</div>
                <div className="rounded-[1.4rem] bg-white/55 px-4 py-3">
                  Última ejecución: {config.ultima_ejecucion ? new Date(config.ultima_ejecucion).toLocaleString("es-CO") : "Aún no ejecutada"}
                </div>
              </div>
            </article>
          ))
        )}
      </section>
    </AppShell>
  );
}
