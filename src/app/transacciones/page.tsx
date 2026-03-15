import { AppShell } from "@/components/app-shell";
import { requireOwnerPageSession } from "@/lib/auth/page-session";
import { isSupabaseConfigured } from "@/lib/db/admin";
import { listTransactions } from "@/lib/services/data-access";

export default async function TransaccionesPage() {
  const session = await requireOwnerPageSession();

  if (!isSupabaseConfigured()) {
    return (
      <AppShell title="Transacciones">
        <p className="rounded-lg border border-amber-700 bg-amber-900/30 p-4 text-amber-200">
          Configura Supabase para consultar transacciones.
        </p>
      </AppShell>
    );
  }

  const rows = await listTransactions({ negocioId: session.negocioId });

  return (
    <AppShell title="Transacciones">
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-800 text-xs uppercase tracking-wide text-slate-300">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Concepto</th>
              <th className="px-4 py-3">Monto</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const tx = row as { id: string; created_at: string; tipo: string; concepto: string; monto: number };
              return (
                <tr key={tx.id} className="border-t border-slate-800">
                  <td className="px-4 py-3 text-slate-300">{new Date(tx.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-300">{tx.tipo}</td>
                  <td className="px-4 py-3 text-slate-200">{tx.concepto}</td>
                  <td className="px-4 py-3 text-cyan-300">${Number(tx.monto).toLocaleString("es-CO")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
