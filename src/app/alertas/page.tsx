import { AppShell } from "@/components/app-shell";
import { AlertsManagerClient } from "@/components/alerts-manager-client";
import { requireOwnerPageSession } from "@/lib/auth/page-session";
import { isSupabaseConfigured } from "@/lib/db/admin";
import { listAllAlertas } from "@/lib/services/data-access";

export default async function AlertasPage() {
  const session = await requireOwnerPageSession();

  if (!isSupabaseConfigured()) {
    return (
      <AppShell title="Alertas" subtitle="Monitorea reglas y objetivos." telefono={session.telefono}>
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
      subtitle="Crea, pausa y revisa reglas del negocio."
      telefono={session.telefono}
    >
      <AlertsManagerClient initialAlerts={alerts} />
    </AppShell>
  );
}
