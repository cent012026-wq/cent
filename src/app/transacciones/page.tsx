import { AppShell } from "@/components/app-shell";
import { requireOwnerPageSession } from "@/lib/auth/page-session";
import { isSupabaseConfigured } from "@/lib/db/admin";
import { listTransactions } from "@/lib/services/data-access";

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);
}

export default async function TransaccionesPage() {
  const session = await requireOwnerPageSession();

  if (!isSupabaseConfigured()) {
    return (
      <AppShell title="Transacciones" subtitle="Consulta tus movimientos." telefono={session.telefono}>
        <p className="glass-panel rounded-[2rem] border border-amber-200 bg-amber-50 px-5 py-4 text-amber-700">
          Configura Supabase para consultar transacciones.
        </p>
      </AppShell>
    );
  }

  const rows = (await listTransactions({ negocioId: session.negocioId })) as Array<{
    id: string;
    created_at: string;
    tipo: "venta" | "costo";
    concepto: string;
    monto: number;
    cantidad?: number;
    detalles?: Record<string, unknown>;
  }>;

  return (
    <AppShell
      title="Historial de transacciones"
      subtitle="Ventas y gastos con fecha, tipo y monto."
      telefono={session.telefono}
    >
      <section className="glass-panel rounded-[2.25rem] p-4 md:p-5">
        <div className="grid gap-4 md:grid-cols-[1fr_180px_180px_auto] md:items-end">
          <div>
            <label className="mb-2 ml-1 block text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Buscar</label>
            <input
              readOnly
              value=""
              placeholder="Concepto, usuario o categoría"
              className="w-full rounded-[1.2rem] border border-white/60 bg-white/65 px-4 py-3 text-sm text-slate-500 outline-none"
            />
          </div>
          <div>
            <label className="mb-2 ml-1 block text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Tipo</label>
            <div className="rounded-[1.2rem] border border-white/60 bg-white/65 px-4 py-3 text-sm text-slate-500">Todos</div>
          </div>
          <div>
            <label className="mb-2 ml-1 block text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Periodo</label>
            <div className="rounded-[1.2rem] border border-white/60 bg-white/65 px-4 py-3 text-sm text-slate-500">Últimos 30 días</div>
          </div>
          <a href="/api/transacciones/export" className="button-secondary w-full px-5 py-3 text-center text-sm md:w-auto">
            Exportar CSV
          </a>
        </div>
      </section>

      <section className="mt-6 glass-panel-strong overflow-hidden rounded-[2.5rem]">
        {rows.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(136,196,62,0.14)] text-2xl font-black text-[var(--brand-ink)]">
              c
            </div>
            <h2 className="mt-5 text-2xl font-bold text-[var(--brand-ink)]">Todavía no hay transacciones</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-500">
              Las ventas y gastos registrados por WhatsApp aparecerán aquí automáticamente.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/30 bg-white/30">
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4">Tipo</th>
                  <th className="px-6 py-4">Concepto</th>
                  <th className="px-6 py-4">Cantidad</th>
                  <th className="px-6 py-4 text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((tx) => (
                  <tr key={tx.id} className="border-b border-white/20 last:border-b-0">
                    <td className="px-6 py-5 text-slate-500">{new Date(tx.created_at).toLocaleString("es-CO")}</td>
                    <td className="px-6 py-5">
                      <span className={`metric-pill ${tx.tipo === "venta" ? "metric-pill-positive" : "metric-pill-negative"}`}>
                        {tx.tipo}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <p className="font-semibold text-[var(--brand-ink)]">{tx.concepto}</p>
                      <p className="mt-1 text-xs text-slate-400">Registro operativo</p>
                    </td>
                    <td className="px-6 py-5 text-slate-600">{tx.cantidad ?? 1}</td>
                    <td className="px-6 py-5 text-right text-base font-bold text-[var(--brand-ink)]">{formatMoney(Number(tx.monto))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}
