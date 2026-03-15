import { AppShell } from "@/components/app-shell";
import { NotificationsManagerClient } from "@/components/notifications-manager-client";
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
      subtitle="Define envíos automáticos y sus horarios."
      telefono={session.telefono}
    >
      <NotificationsManagerClient initialConfigs={configs} />
    </AppShell>
  );
}
