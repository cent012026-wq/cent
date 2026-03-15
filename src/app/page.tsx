import Link from "next/link";

const keyViews = [
  {
    title: "Dashboard vivo",
    description: "Visualiza ventas, costos, margen y señales del día en una sola lectura.",
  },
  {
    title: "Historial limpio",
    description: "Cada mensaje se convierte en una transacción con fecha, concepto, monto y responsable.",
  },
  {
    title: "Equipo por WhatsApp",
    description: "Agrega vendedores por número y mantén una whitelist clara para operar sin desorden.",
  },
];

export default function Home() {
  return (
    <main className="watercolor-shell overflow-hidden px-4 pb-20 pt-24 text-slate-800 md:px-6 lg:px-8">
      <section className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <div className="eyebrow mb-6">WhatsApp operativo + Web admin</div>
          <h1 className="max-w-3xl text-5xl font-bold leading-[1.02] tracking-tight text-[var(--brand-ink)] md:text-6xl lg:text-7xl">
            Registra ventas y gastos por <span className="text-lime-600">WhatsApp</span> y controla tu negocio desde una sola vista.
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-8 text-slate-600 md:text-xl">
            cent convierte mensajes y notas de voz en transacciones organizadas, métricas útiles y decisiones más rápidas para comercios que ya viven en WhatsApp.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link href="/login" className="button-primary px-8 py-4 text-base md:text-lg">
              Entrar al panel
              <span aria-hidden="true">→</span>
            </Link>
            <Link href="#vistas" className="button-secondary px-8 py-4 text-base md:text-lg">
              Ver vistas clave
            </Link>
          </div>

          <div className="mt-12 flex flex-wrap items-center gap-6 text-sm text-slate-500">
            <div className="flex -space-x-3">
              <div className="h-10 w-10 rounded-full border-2 border-white bg-[linear-gradient(135deg,#88c43e,#d9f99d)]" />
              <div className="h-10 w-10 rounded-full border-2 border-white bg-[linear-gradient(135deg,#fde047,#fef9c3)]" />
              <div className="h-10 w-10 rounded-full border-2 border-white bg-[linear-gradient(135deg,#7dd3fc,#bae6fd)]" />
            </div>
            <p>Diseñado para comercios que venden rápido y necesitan orden sin software pesado.</p>
          </div>
        </div>

        <div className="relative">
          <div className="grid grid-cols-12 gap-4">
            <article className="glass-panel-strong col-span-7 rounded-[2.25rem] p-4 shadow-2xl shadow-lime-500/10 md:p-5">
              <div className="overflow-hidden rounded-[1.5rem] bg-[#e7ddd2]">
                <div className="flex items-center gap-3 bg-[#12584a] px-4 py-3 text-white">
                  <div className="h-8 w-8 rounded-full bg-white/20" />
                  <div>
                    <p className="text-sm font-bold">cent assistant</p>
                    <p className="text-xs text-white/70">WhatsApp operativo</p>
                  </div>
                </div>
                <div className="space-y-3 p-4 text-sm leading-6">
                  <div className="max-w-[82%] rounded-2xl rounded-tl-sm bg-white px-3 py-2 shadow-sm">
                    Hola. ¿Qué quieres registrar hoy?
                  </div>
                  <div className="ml-auto max-w-[84%] rounded-2xl rounded-tr-sm bg-[#dcf8c6] px-3 py-2 shadow-sm">
                    Vendí 2 cafés y 1 croissant por 15.500
                  </div>
                  <div className="max-w-[86%] rounded-2xl rounded-tl-sm bg-white px-3 py-2 shadow-sm">
                    Registrado. Venta por $15.500, cantidad 3. ¿Quieres ver cómo va el día?
                  </div>
                </div>
              </div>
            </article>

            <article className="glass-panel col-span-8 col-start-5 -ml-6 mt-12 rounded-[2.5rem] p-6 md:p-7">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold text-[var(--brand-ink)]">Panel ejecutivo</p>
                  <p className="text-sm text-slate-500">Ventas, costos y margen en una lectura.</p>
                </div>
                <div className="flex gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-lime-500" />
                </div>
              </div>
              <div className="space-y-4">
                <div className="mock-grid rounded-[1.75rem] bg-[linear-gradient(135deg,rgba(136,196,62,0.18),rgba(242,232,94,0.12))] p-5">
                  <div className="flex h-36 items-end gap-3">
                    {[36, 58, 44, 80, 66, 88].map((height, index) => (
                      <div
                        // eslint-disable-next-line react/no-array-index-key
                        key={index}
                        className="flex-1 rounded-t-2xl bg-[linear-gradient(180deg,#88c43e,#f2e85e)]"
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[1.4rem] bg-white/60 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Ventas del día</p>
                    <p className="mt-2 text-3xl font-bold text-[var(--brand-ink)]">$2,45M</p>
                  </div>
                  <div className="rounded-[1.4rem] bg-white/60 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Margen</p>
                    <p className="mt-2 text-3xl font-bold text-[var(--brand-ink)]">74%</p>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto mt-24 max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <div className="eyebrow">Cómo funciona</div>
          <h2 className="mt-5 text-4xl font-bold tracking-tight text-[var(--brand-ink)] md:text-5xl">
            Un flujo simple para negocios que no quieren perder tiempo digitando.
          </h2>
          <p className="mt-6 text-lg leading-8 text-slate-600">
            La operación ocurre en WhatsApp. La claridad aparece en web. Esa separación hace que cent se sienta liviano, útil y adoptable desde el primer día.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {[
            {
              title: "1. Escribes como siempre",
              text: "Ventas, gastos, preguntas rápidas o notas de voz. Sin formularios eternos.",
              tone: "from-yellow-100 to-white/70",
            },
            {
              title: "2. cent lo estructura",
              text: "Convierte lenguaje natural en transacciones, contexto y señales accionables.",
              tone: "from-lime-100 to-white/70",
            },
            {
              title: "3. El dueño controla",
              text: "Dashboard, historial, alertas, equipo y configuración desde una sola vista administrativa.",
              tone: "from-sky-100 to-white/70",
            },
          ].map((step) => (
            <article
              key={step.title}
              className={`glass-panel rounded-[2.25rem] bg-gradient-to-br ${step.tone} p-8 transition-transform hover:-translate-y-1`}
            >
              <h3 className="text-2xl font-bold text-[var(--brand-ink)]">{step.title}</h3>
              <p className="mt-4 text-base leading-7 text-slate-600">{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="vistas" className="mx-auto mt-24 max-w-7xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="eyebrow">Vistas clave</div>
            <h2 className="mt-5 text-4xl font-bold tracking-tight text-[var(--brand-ink)] md:text-5xl">
              Las pantallas que sostienen la operación real del negocio.
            </h2>
          </div>
          <p className="max-w-2xl text-base leading-7 text-slate-600">
            Tu referencia visual no se queda en una landing bonita. cent necesita un sistema coherente entre landing, login, dashboard, historial y gestión de equipo.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="space-y-4">
            {keyViews.map((view) => (
              <article key={view.title} className="glass-panel rounded-[2rem] p-6">
                <h3 className="text-2xl font-bold text-[var(--brand-ink)]">{view.title}</h3>
                <p className="mt-3 leading-7 text-slate-600">{view.description}</p>
              </article>
            ))}
          </div>

          <article className="glass-panel-strong rounded-[2.5rem] p-6 md:p-8">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-[2rem] bg-white/60 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <p className="font-bold text-[var(--brand-ink)]">Historial</p>
                  <span className="metric-pill metric-pill-neutral">Filtrado</span>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="rounded-2xl bg-white/70 p-3">
                    <p className="font-semibold text-[var(--brand-ink)]">Venta · 2 camisas</p>
                    <p className="text-slate-500">$80.000 · vendedor 01</p>
                  </div>
                  <div className="rounded-2xl bg-white/70 p-3">
                    <p className="font-semibold text-[var(--brand-ink)]">Costo · transporte</p>
                    <p className="text-slate-500">$20.000 · admin</p>
                  </div>
                </div>
              </div>
              <div className="rounded-[2rem] bg-[linear-gradient(135deg,rgba(136,196,62,0.12),rgba(242,232,94,0.06))] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <p className="font-bold text-[var(--brand-ink)]">Equipo</p>
                  <span className="metric-pill metric-pill-positive">WhatsApp</span>
                </div>
                <div className="space-y-3 text-sm">
                  {[
                    ["Ana", "+57 300 111 2233", "Activo"],
                    ["Carlos", "+57 301 998 4455", "Activo"],
                    ["Lucía", "+57 320 554 1002", "Invitado"],
                  ].map(([name, phone, state]) => (
                    <div key={phone} className="flex items-center justify-between rounded-2xl bg-white/60 px-4 py-3">
                      <div>
                        <p className="font-semibold text-[var(--brand-ink)]">{name}</p>
                        <p className="text-slate-500">{phone}</p>
                      </div>
                      <span className={`metric-pill ${state === "Activo" ? "metric-pill-positive" : "metric-pill-neutral"}`}>{state}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="mx-auto mt-24 max-w-6xl">
        <div className="glass-panel-strong relative overflow-hidden rounded-[2.75rem] px-6 py-12 text-center md:px-12 md:py-16">
          <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(242,232,94,0.4),transparent_70%)]" />
          <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(136,196,62,0.28),transparent_70%)]" />
          <div className="relative">
            <div className="eyebrow">SaaS moderno, sin humo</div>
            <h2 className="mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight text-[var(--brand-ink)] md:text-5xl">
              Menos libreta. Menos caos. Más control operativo desde el canal que tu equipo ya usa.
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              cent está pensado para dueños que necesitan orden hoy, no dentro de tres meses de implementación.
            </p>
            <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
              <Link href="/login" className="button-primary px-10 py-4 text-lg">
                Probar cent ahora
              </Link>
              <Link href="/dashboard" className="button-secondary px-10 py-4 text-lg">
                Ver el panel
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
