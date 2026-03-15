import { AppShell } from "@/components/app-shell";
import { requireOwnerPageSession } from "@/lib/auth/page-session";
import { isSupabaseConfigured } from "@/lib/db/admin";
import { listAllAlertas } from "@/lib/services/data-access";

export default async function AlertasPage() {
  const session = await requireOwnerPageSession();

  if (!isSupabaseConfigured()) {
    return (
      <AppShell title="Alertas" subtitle="Monitorea metas, umbrales y seguimiento sin revisar todo manualmente.">
        <p className="glass-panel rounded-[2rem] border border-amber-200 bg-amber-50 px-5 py-4 text-amber-700">
          Configura Supabase para gestionar alertas.
        </p>
      </AppShell>
    );
  }

  const alerts = await listAllAlertas(session.negocioId);

  return (
    <AppShell
      title="Alertas"
      subtitle="Las alertas ayudan al dueño a reaccionar a metas, montos o señales del negocio sin depender de revisar cada mensaje uno por uno."
    >
      <section className="grid gap-5 xl:grid-cols-2">
        {alerts.length === 0 ? (
          <article className="glass-panel rounded-[2.4rem] p-10 xl:col-span-2">
            <h2 className="text-2xl font-bold text-[var(--brand-ink)]">Todavía no hay alertas creadas</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
              Cuando actives reglas, aquí verás progreso, estado y si el sistema ya notificó o todavía está observando el comportamiento del negocio.
            </p>
          </article>
        ) : (
          alerts.map((alert) => {
            const progress = alert.objetivo_numerico
              ? Math.max(0, Math.min(100, Math.round((Number(alert.progreso_actual) / Number(alert.objetivo_numerico)) * 100)))
              : 0;

            return (
              <article key={alert.id} className="glass-panel rounded-[2.4rem] p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-2xl font-bold text-[var(--brand-ink)]">{alert.nombre}</p>
                    <p className="mt-2 text-sm text-slate-500">Seguimiento automático a partir de actividad y transacciones.</p>
                  </div>
                  <span className={`metric-pill ${alert.activa ? "metric-pill-positive" : "metric-pill-neutral"}`}>
                    {alert.activa ? "Activa" : "Inactiva"}
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
                  <span className={`metric-pill ${alert.notificada ? "metric-pill-neutral" : "metric-pill-positive"}`}>
                    {alert.notificada ? "Ya notificada" : "Pendiente de notificar"}
                  </span>
                </div>
              </article>
            );
          })
        )}
      </section>
    </AppShell>
  );
}
