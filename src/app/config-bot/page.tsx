import { AppShell } from "@/components/app-shell";
import { BotConfigClient } from "@/components/bot-config-client";
import { requireOwnerPageSession } from "@/lib/auth/page-session";
import { isSupabaseConfigured } from "@/lib/db/admin";
import { findNegocioById } from "@/lib/services/data-access";

export default async function ConfigBotPage() {
  const session = await requireOwnerPageSession();

  if (!isSupabaseConfigured()) {
    return (
      <AppShell title="Config bot" subtitle="Ajusta la identidad del asistente." telefono={session.telefono}>
        <p className="glass-panel rounded-[2rem] border border-amber-200 bg-amber-50 px-5 py-4 text-amber-700">
          Configura Supabase para personalizar el bot.
        </p>
      </AppShell>
    );
  }

  const negocio = await findNegocioById(session.negocioId);

  return (
    <AppShell
      title="Config bot"
      subtitle="Ajusta identidad y estilo de respuesta."
      telefono={session.telefono}
    >
      <BotConfigClient
        initialNombre={negocio?.config_agente?.nombre ?? "cent"}
        initialTono={negocio?.config_agente?.tono ?? "amable"}
        initialJerga={negocio?.config_agente?.jerga ?? "neutro"}
        negocioNombre={negocio?.nombre ?? "Sin negocio"}
        plan={negocio?.plan ?? "trial"}
      />
    </AppShell>
  );
}
