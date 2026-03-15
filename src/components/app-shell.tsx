import Link from "next/link";
import type { ReactNode } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/transacciones", label: "Transacciones" },
  { href: "/atributos", label: "Atributos" },
  { href: "/equipo", label: "Equipo" },
  { href: "/alertas", label: "Alertas" },
  { href: "/notificaciones", label: "Notificaciones" },
  { href: "/config-bot", label: "Config Bot" },
];

export function AppShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <Link href="/dashboard" className="text-sm font-semibold tracking-wide text-cyan-300">
            cent Control
          </Link>
          <nav className="flex flex-wrap gap-2 text-xs">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full border border-slate-700 px-3 py-1 text-slate-300 hover:border-cyan-400 hover:text-cyan-300"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="mb-5 text-2xl font-semibold text-slate-100">{title}</h1>
        {children}
      </main>
    </div>
  );
}
