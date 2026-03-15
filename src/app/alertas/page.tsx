import { AppShell } from "@/components/app-shell";
import { requireOwnerPageSession } from "@/lib/auth/page-session";
import { isSupabaseConfigured } from "@/lib/db/admin";
import { listAllAlertas } from "@/lib/services/data-access";

export default async function AlertasPage() {
  const session = await requireOwnerPageSession();

  if (!isSupabaseConfigured()) {
    return (
      <AppShell title="Alertas">
        <p className="rounded-lg border border-amber-700 bg-amber-900/30 p-4 text-amber-200">
          Configura Supabase para gestionar alertas.
        </p>
      </AppShell>
    );
  }

  const alerts = await listAllAlertas(session.negocioId);

  return (
    <AppShell title="Alertas">
      <div className="space-y-3">
        {alerts.map((alert) => (
          <article key={alert.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="font-semibold text-cyan-300">{alert.nombre}</p>
            <p className="text-sm text-slate-300">
              Progreso: {alert.progreso_actual} / {alert.objetivo_numerico ?? "-"}
            </p>
            <p className="text-xs text-slate-400">
              Estado: {alert.activa ? "Activa" : "Inactiva"} · Notificada: {alert.notificada ? "Sí" : "No"}
            </p>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
