import { AppShell } from "@/components/app-shell";
import { requireOwnerPageSession } from "@/lib/auth/page-session";
import { isSupabaseConfigured } from "@/lib/db/admin";
import { listTeamUsers } from "@/lib/services/data-access";

export default async function EquipoPage() {
  const session = await requireOwnerPageSession();

  if (!isSupabaseConfigured()) {
    return (
      <AppShell title="Equipo" subtitle="Administra roles, permisos y números autorizados del negocio.">
        <p className="glass-panel rounded-[2rem] border border-amber-200 bg-amber-50 px-5 py-4 text-amber-700">
          Configura Supabase para gestionar equipo.
        </p>
      </AppShell>
    );
  }

  const users = await listTeamUsers(session.negocioId);
  const activeCount = users.filter((user) => user.activo).length;
  const sellerCount = users.filter((user) => user.rol === "vendedor").length;
  const costEnabled = users.filter((user) => user.puede_registrar_costos).length;

  return (
    <AppShell
      title="Gestión de equipo"
      subtitle="Controla qué números de WhatsApp están autorizados, qué rol tiene cada persona y quién puede reportar costos o ventas."
    >
      <section className="grid gap-5 md:grid-cols-3">
        {[
          ["Miembros activos", activeCount.toString(), "operación disponible"],
          ["Vendedores", sellerCount.toString(), "números en whitelist"],
          ["Con permiso de costos", costEnabled.toString(), "alcance administrativo"],
        ].map(([label, value, note]) => (
          <article key={label} className="glass-panel stat-card rounded-[2.2rem]">
            <p className="text-sm font-semibold text-slate-500">{label}</p>
            <p className="mt-4 text-4xl font-bold text-[var(--brand-ink)]">{value}</p>
            <p className="mt-3 text-sm text-slate-500">{note}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--brand-ink)]">Equipo conectado por WhatsApp</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">Esta vista debe dejar claro quién opera, quién administra y qué número está autorizado para interactuar con cent.</p>
        </div>
        <button className="button-primary px-6 py-3 text-sm">Agregar vendedor</button>
      </section>

      <section className="mt-6 glass-panel-strong overflow-hidden rounded-[2.5rem]">
        <div className="overflow-x-auto">
          <table className="data-table min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/30 bg-white/30">
                <th className="px-6 py-4">Miembro</th>
                <th className="px-6 py-4">Rol</th>
                <th className="px-6 py-4">WhatsApp</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Costos</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-white/20 last:border-b-0">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#d9f99d,#fef08a)] font-bold text-[var(--brand-ink)]">
                        {(user.nombre ?? "SN").slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-[var(--brand-ink)]">{user.nombre ?? "Sin nombre"}</p>
                        <p className="text-xs text-slate-400">Identidad operativa del negocio</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`metric-pill ${user.rol === "dueno" ? "metric-pill-neutral" : "metric-pill-positive"}`}>{user.rol}</span>
                  </td>
                  <td className="px-6 py-5 font-mono text-slate-600">{user.telefono}</td>
                  <td className="px-6 py-5">
                    <span className={`metric-pill ${user.activo ? "metric-pill-positive" : "metric-pill-negative"}`}>{user.activo ? "Activo" : "Inactivo"}</span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <span className={`metric-pill ${user.puede_registrar_costos ? "metric-pill-positive" : "metric-pill-neutral"}`}>
                      {user.puede_registrar_costos ? "Permitido" : "Bloqueado"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
