"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { CentLogo } from "@/components/cent-logo";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/transacciones", label: "Transacciones" },
  { href: "/atributos", label: "Atributos" },
  { href: "/equipo", label: "Equipo" },
  { href: "/alertas", label: "Alertas" },
  { href: "/notificaciones", label: "Notificaciones" },
  { href: "/config-bot", label: "Config Bot" },
];

export function AppShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="watercolor-shell min-h-screen text-slate-800">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] gap-4 px-4 py-4 md:px-6 lg:px-8">
        <aside className="glass-panel-strong hidden w-72 shrink-0 rounded-[2rem] p-6 lg:flex lg:flex-col">
          <Link href="/dashboard" className="mb-8">
            <div className="flex items-center gap-3">
              <CentLogo compact />
              <div>
                <p className="text-2xl font-bold tracking-tight text-[var(--brand-ink)]">cent</p>
                <p className="text-sm text-slate-500">Control por WhatsApp</p>
              </div>
            </div>
          </Link>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${
                    active
                      ? "bg-[rgba(136,196,62,0.14)] text-[var(--brand-ink)] shadow-sm"
                      : "text-slate-500 hover:bg-white/50 hover:text-[var(--brand-ink)]"
                  }`}
                >
                  <span>{item.label}</span>
                  <span className={`h-2.5 w-2.5 rounded-full ${active ? "bg-[var(--brand-lime)]" : "bg-transparent"}`} />
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto rounded-[1.75rem] bg-[linear-gradient(135deg,rgba(136,196,62,0.16),rgba(242,232,94,0.1))] p-5">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">Estado</p>
            <p className="mt-3 text-lg font-semibold text-[var(--brand-ink)]">Tu negocio opera en chat.</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Administra equipo, métricas y configuración desde la web sin romper el flujo diario de WhatsApp.
            </p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <header className="glass-panel-strong rounded-[2rem] px-5 py-4 md:px-7 md:py-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="eyebrow mb-3">cent workspace</div>
                <h1 className="text-3xl font-bold tracking-tight text-[var(--brand-ink)] md:text-4xl">{title}</h1>
                {subtitle ? <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">{subtitle}</p> : null}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="glass-panel flex items-center gap-3 rounded-full px-2 py-2 pr-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-lime)] font-bold text-[var(--brand-ink)]">
                    CT
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--brand-ink)]">Control Team</p>
                    <p className="text-xs text-slate-500">Owner Session</p>
                  </div>
                </div>
                <Link href="/" className="button-secondary px-5 py-3 text-sm">
                  Ver landing
                </Link>
              </div>
            </div>
          </header>

          <nav className="glass-panel flex gap-2 overflow-x-auto rounded-[1.75rem] p-2 lg:hidden">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${
                    active ? "bg-[var(--brand-ink)] text-white" : "text-slate-600"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <main className="flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
