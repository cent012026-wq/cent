import { AppShell } from "@/components/app-shell";
import { requireOwnerPageSession } from "@/lib/auth/page-session";
import { isSupabaseConfigured } from "@/lib/db/admin";
import { listAtributos } from "@/lib/services/data-access";

export default async function AtributosPage() {
  const session = await requireOwnerPageSession();

  if (!isSupabaseConfigured()) {
    return (
      <AppShell title="Atributos">
        <p className="rounded-lg border border-amber-700 bg-amber-900/30 p-4 text-amber-200">
          Configura Supabase para administrar atributos dinámicos.
        </p>
      </AppShell>
    );
  }

  const attrs = await listAtributos(session.negocioId);

  return (
    <AppShell title="Atributos Dinámicos">
      <div className="grid gap-3 sm:grid-cols-2">
        {attrs.map((attr) => (
          <article key={attr.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-lg font-medium text-cyan-300">{attr.nombre_campo}</p>
            <p className="text-sm text-slate-300">Tipo: {attr.tipo_dato}</p>
            <p className="text-sm text-slate-300">Obligatorio: {attr.es_obligatorio ? "Sí" : "No"}</p>
            <p className="text-sm text-slate-400">{attr.es_core ? "Core" : "Personalizable"}</p>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
