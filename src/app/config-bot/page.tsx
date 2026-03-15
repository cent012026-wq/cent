import { AppShell } from "@/components/app-shell";
import { requireOwnerPageSession } from "@/lib/auth/page-session";
import { isSupabaseConfigured } from "@/lib/db/admin";
import { findNegocioById } from "@/lib/services/data-access";

export default async function ConfigBotPage() {
  const session = await requireOwnerPageSession();

  if (!isSupabaseConfigured()) {
    return (
      <AppShell title="Config Bot">
        <p className="rounded-lg border border-amber-700 bg-amber-900/30 p-4 text-amber-200">
          Configura Supabase para personalizar el bot.
        </p>
      </AppShell>
    );
  }

  const negocio = await findNegocioById(session.negocioId);

  return (
    <AppShell title="Configuración del Bot">
      <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <p className="text-sm text-slate-400">Negocio</p>
        <p className="mb-3 text-xl font-semibold text-cyan-300">{negocio?.nombre ?? "Sin negocio"}</p>
        <p className="text-sm text-slate-300">Nombre bot: {negocio?.config_agente?.nombre ?? "VendBot"}</p>
        <p className="text-sm text-slate-300">Tono: {negocio?.config_agente?.tono ?? "amable"}</p>
        <p className="text-sm text-slate-300">Jerga: {negocio?.config_agente?.jerga ?? "neutro"}</p>
      </article>
    </AppShell>
  );
}
