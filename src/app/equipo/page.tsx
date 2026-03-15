import { AppShell } from "@/components/app-shell";
import { TeamManagementClient } from "@/components/team-management-client";
import { requireOwnerPageSession } from "@/lib/auth/page-session";
import { isSupabaseConfigured } from "@/lib/db/admin";
import { listTeamUsers } from "@/lib/services/data-access";

export default async function EquipoPage() {
  const session = await requireOwnerPageSession();

  if (!isSupabaseConfigured()) {
    return (
      <AppShell title="Equipo" subtitle="Administra el acceso del equipo." telefono={session.telefono}>
        <p className="glass-panel rounded-[2rem] border border-amber-200 bg-amber-50 px-5 py-4 text-amber-700">
          Configura Supabase para gestionar equipo.
        </p>
      </AppShell>
    );
  }

  const users = await listTeamUsers(session.negocioId);

  return (
    <AppShell title="Equipo" subtitle="Usuarios, permisos y números autorizados." telefono={session.telefono}>
      <TeamManagementClient initialUsers={users} />
    </AppShell>
  );
}
