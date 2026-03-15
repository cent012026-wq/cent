import { AppShell } from "@/components/app-shell";
import { requireOwnerPageSession } from "@/lib/auth/page-session";
import { isSupabaseConfigured } from "@/lib/db/admin";
import { getMetricsSummary } from "@/lib/services/metrics";

export default async function DashboardPage() {
  const session = await requireOwnerPageSession();

  if (!isSupabaseConfigured()) {
    return (
      <AppShell title="Dashboard">
        <p className="rounded-lg border border-amber-700 bg-amber-900/30 p-4 text-amber-200">
          Configura las variables de Supabase para visualizar métricas reales.
        </p>
      </AppShell>
    );
  }

  const summary = await getMetricsSummary({
    negocioId: session.negocioId,
    rol: "dueno",
  });

  const cards = [
    { label: "Ventas", value: `$${summary.totalVentas.toLocaleString("es-CO")}` },
    { label: "Costos", value: `$${summary.totalCostos.toLocaleString("es-CO")}` },
    { label: "Margen", value: `$${summary.margen.toLocaleString("es-CO")}` },
    { label: "Transacciones", value: summary.totalTransacciones.toString() },
  ];

  return (
    <AppShell title="Dashboard">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <article key={card.label} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold text-cyan-300">{card.value}</p>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
