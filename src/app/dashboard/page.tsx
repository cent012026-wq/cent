import { AppShell } from "@/components/app-shell";
import { requireOwnerPageSession } from "@/lib/auth/page-session";
import { isSupabaseConfigured } from "@/lib/db/admin";
import { getMetricsSummary } from "@/lib/services/metrics";

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);
}

export default async function DashboardPage() {
  const session = await requireOwnerPageSession();

  if (!isSupabaseConfigured()) {
    return (
      <AppShell title="Dashboard" subtitle="Conecta Supabase para ver tus métricas." telefono={session.telefono}>
        <p className="glass-panel rounded-[2rem] border border-amber-200 bg-amber-50 px-5 py-4 text-amber-700">
          Configura las variables de Supabase para visualizar métricas reales.
        </p>
      </AppShell>
    );
  }

  const summary = await getMetricsSummary({
    negocioId: session.negocioId,
    rol: "dueno",
  });

  const revenueTrend = [22, 30, 34, 48, 56, 62, 58, 74, 79, 85, 88, 94];
  const marginProgress = Math.max(0, Math.min(100, summary.totalVentas > 0 ? Math.round((summary.margen / summary.totalVentas) * 100) : 0));

  return (
    <AppShell
      title="Dashboard"
      subtitle="Ventas, costos y margen del periodo actual."
      telefono={session.telefono}
    >
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Ventas del día",
            value: formatMoney(summary.totalVentas),
            note: `${summary.totalVentasCount} ventas registradas`,
            pill: "+ foco comercial",
            tone: "metric-pill-positive",
          },
          {
            label: "Costos del día",
            value: formatMoney(summary.totalCostos),
            note: "Gastos operativos reportados",
            pill: "vigilar salida",
            tone: "metric-pill-negative",
          },
          {
            label: "Margen operativo",
            value: formatMoney(summary.margen),
            note: `${marginProgress}% sobre ventas`,
            pill: marginProgress >= 50 ? "saludable" : "ajustar",
            tone: marginProgress >= 50 ? "metric-pill-positive" : "metric-pill-negative",
          },
          {
            label: "Transacciones",
            value: summary.totalTransacciones.toString(),
            note: summary.topVendedorId ? "Hay un vendedor líder activo" : "Aún sin top vendedor detectado",
            pill: "tiempo real",
            tone: "metric-pill-neutral",
          },
        ].map((card) => (
          <article key={card.label} className="glass-panel stat-card rounded-[2.2rem]">
            <p className="text-sm font-semibold text-slate-500">{card.label}</p>
            <p className="mt-4 text-4xl font-bold tracking-tight text-[var(--brand-ink)]">{card.value}</p>
            <div className="mt-5 flex items-center justify-between gap-3">
              <span className={`metric-pill ${card.tone}`}>{card.pill}</span>
              <span className="text-xs font-medium text-slate-400">{card.note}</span>
            </div>
          </article>
        ))}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="glass-panel-strong rounded-[2.6rem] p-6 md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-2xl font-bold text-[var(--brand-ink)]">Tendencia de ventas</p>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">Comportamiento reciente de las ventas registradas.</p>
            </div>
            <div className="flex gap-2">
              <span className="metric-pill metric-pill-positive">Mensual</span>
              <span className="metric-pill metric-pill-neutral">Hoy</span>
            </div>
          </div>

          <div className="mt-8 rounded-[2rem] bg-[linear-gradient(135deg,rgba(136,196,62,0.14),rgba(242,232,94,0.07))] p-5">
            <div className="flex h-72 items-end gap-3">
              {revenueTrend.map((height, index) => (
                <div key={height + index} className="flex flex-1 flex-col justify-end gap-2">
                  <div
                    className="rounded-t-[1.2rem] bg-[linear-gradient(180deg,#88c43e,#f2e85e)] shadow-[0_10px_18px_rgba(136,196,62,0.12)]"
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-center text-[0.65rem] font-bold uppercase tracking-[0.2em] text-slate-400">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </article>

        <div className="space-y-6">
          <article className="glass-panel rounded-[2.4rem] p-6">
            <p className="text-lg font-bold text-[var(--brand-ink)]">Margen sobre ventas</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">Lectura rápida de cuánto de lo vendido realmente se está quedando en caja.</p>
            <p className="mt-6 text-5xl font-bold tracking-tight text-[var(--brand-ink)]">{marginProgress}%</p>
            <div className="progress-rail mt-6">
              <div className="progress-fill" style={{ width: `${marginProgress}%` }} />
            </div>
          </article>

          <article className="glass-panel rounded-[2.4rem] p-6">
            <div className="flex items-center justify-between">
              <p className="text-lg font-bold text-[var(--brand-ink)]">Estado del día</p>
              <span className="metric-pill metric-pill-neutral">Actual</span>
            </div>
            <div className="mt-5 space-y-4 text-sm leading-6 text-slate-600">
              <div className="rounded-[1.5rem] bg-white/55 p-4">
                <p className="font-semibold text-[var(--brand-ink)]">Ventas registradas</p>
                <p>{summary.totalVentasCount} movimientos comerciales ya estructurados por el agente.</p>
              </div>
              <div className="rounded-[1.5rem] bg-white/55 p-4">
                <p className="font-semibold text-[var(--brand-ink)]">Equipo líder</p>
                <p>{summary.topVendedorId ? "Ya existe un vendedor con mejor ritmo de registro hoy." : "Aún no hay suficiente volumen para detectar líder."}</p>
              </div>
            </div>
          </article>
        </div>
      </section>
    </AppShell>
  );
}
