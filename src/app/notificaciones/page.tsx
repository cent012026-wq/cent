import { AppShell } from "@/components/app-shell";
import { requireOwnerPageSession } from "@/lib/auth/page-session";
import { isSupabaseConfigured } from "@/lib/db/admin";
import { listNotificacionConfig } from "@/lib/services/data-access";

export default async function NotificacionesPage() {
  const session = await requireOwnerPageSession();

  if (!isSupabaseConfigured()) {
    return (
      <AppShell title="Notificaciones">
        <p className="rounded-lg border border-amber-700 bg-amber-900/30 p-4 text-amber-200">
          Configura Supabase para administrar notificaciones.
        </p>
      </AppShell>
    );
  }

  const configs = await listNotificacionConfig(session.negocioId);

  return (
    <AppShell title="Notificaciones">
      <div className="space-y-3">
        {configs.map((config) => (
          <article key={config.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="font-semibold text-cyan-300">{config.tipo}</p>
            <p className="text-sm text-slate-300">Activa: {config.activa ? "Sí" : "No"}</p>
            <p className="text-sm text-slate-300">Hora: {config.hora_envio ?? "N/A"}</p>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
