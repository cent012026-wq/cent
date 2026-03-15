import { AppShell } from "@/components/app-shell";
import { requireOwnerPageSession } from "@/lib/auth/page-session";
import { isSupabaseConfigured } from "@/lib/db/admin";
import { listAtributos } from "@/lib/services/data-access";

export default async function AtributosPage() {
  const session = await requireOwnerPageSession();

  if (!isSupabaseConfigured()) {
    return (
      <AppShell title="Atributos" subtitle="Define los campos del negocio." telefono={session.telefono}>
        <p className="glass-panel rounded-[2rem] border border-amber-200 bg-amber-50 px-5 py-4 text-amber-700">
          Configura Supabase para administrar atributos dinámicos.
        </p>
      </AppShell>
    );
  }

  const attrs = await listAtributos(session.negocioId);

  return (
    <AppShell
      title="Atributos"
      subtitle="Campos que cent debe capturar al registrar ventas o gastos."
      telefono={session.telefono}
    >
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {attrs.map((attr) => (
          <article key={attr.id} className="glass-panel rounded-[2.3rem] p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-2xl font-bold text-[var(--brand-ink)]">{attr.nombre_campo}</p>
                <p className="mt-2 text-sm text-slate-500">Tipo: {attr.tipo_dato}</p>
              </div>
              <span className={`metric-pill ${attr.es_core ? "metric-pill-neutral" : "metric-pill-positive"}`}>
                {attr.es_core ? "Core" : "Personalizable"}
              </span>
            </div>
            <div className="mt-6 space-y-3 text-sm text-slate-600">
              <div className="rounded-[1.4rem] bg-white/55 px-4 py-3">Obligatorio: {attr.es_obligatorio ? "Sí" : "No"}</div>
              <div className="rounded-[1.4rem] bg-white/55 px-4 py-3">Orden visual: {attr.orden ?? "Sin orden"}</div>
            </div>
          </article>
        ))}
      </section>
    </AppShell>
  );
}
