import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      <section className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-xl shadow-black/40">
        <p className="mb-3 inline-flex rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-xs uppercase tracking-widest text-cyan-300">
          WhatsApp operativo + Web admin
        </p>
        <h1 className="mb-3 text-4xl font-semibold text-slate-100">cent V1</h1>
        <p className="mb-6 text-slate-300">
          Plataforma para registro de ventas y gastos por WhatsApp con un centro de control mobile-first en web.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/login" className="rounded-lg bg-cyan-500 px-4 py-2 font-medium text-slate-950">
            Ingresar al panel
          </Link>
          <Link
            href="/api/health"
            className="rounded-lg border border-slate-700 px-4 py-2 font-medium text-slate-200 hover:border-cyan-400"
          >
            Healthcheck API
          </Link>
        </div>
      </section>
    </main>
  );
}
