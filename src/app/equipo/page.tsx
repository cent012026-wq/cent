import { AppShell } from "@/components/app-shell";
import { requireOwnerPageSession } from "@/lib/auth/page-session";
import { isSupabaseConfigured } from "@/lib/db/admin";
import { listTeamUsers } from "@/lib/services/data-access";

export default async function EquipoPage() {
  const session = await requireOwnerPageSession();

  if (!isSupabaseConfigured()) {
    return (
      <AppShell title="Equipo">
        <p className="rounded-lg border border-amber-700 bg-amber-900/30 p-4 text-amber-200">
          Configura Supabase para gestionar equipo.
        </p>
      </AppShell>
    );
  }

  const users = await listTeamUsers(session.negocioId);

  return (
    <AppShell title="Equipo">
      <div className="space-y-3">
        {users.map((user) => (
          <article key={user.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-100">{user.nombre ?? "Sin nombre"}</p>
                <p className="text-sm text-slate-400">{user.telefono}</p>
              </div>
              <div className="text-right text-sm text-slate-300">
                <p>{user.rol}</p>
                <p>{user.activo ? "Activo" : "Inactivo"}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
