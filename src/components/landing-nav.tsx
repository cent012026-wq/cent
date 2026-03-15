"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { CentLogo } from "@/components/cent-logo";

const navItems = [
  { href: "#how-it-works", label: "Cómo funciona" },
  { href: "#vistas", label: "Vistas clave" },
];

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 16);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 md:px-6">
      <div
        className={`mx-auto max-w-7xl overflow-hidden rounded-[1.8rem] border transition-all duration-500 ${
          scrolled
            ? "border-white/70 bg-white/65 shadow-[0_20px_50px_rgba(15,23,42,0.12)] backdrop-blur-2xl"
            : "border-white/35 bg-white/30 backdrop-blur-xl"
        }`}
      >
        <div className="flex items-center justify-between gap-4 px-5 py-4 md:px-6">
          <Link href="/" className="transition-transform duration-300 hover:scale-[1.01]">
            <CentLogo />
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition-all hover:bg-white/55 hover:text-slate-900"
              >
                {item.label}
              </Link>
            ))}
            <Link href="/login" className="button-primary px-5 py-3 text-sm">
              Entrar
            </Link>
          </nav>

          <button
            type="button"
            aria-label="Abrir menú"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/55 text-slate-700 transition hover:bg-white/80 md:hidden"
            onClick={() => setOpen((value) => !value)}
          >
            <span className={`block h-0.5 w-5 rounded-full bg-current transition ${open ? "translate-y-1 rotate-45" : "-translate-y-1.5"}`} />
            <span className={`absolute block h-0.5 w-5 rounded-full bg-current transition ${open ? "opacity-0" : "opacity-100"}`} />
            <span className={`block h-0.5 w-5 rounded-full bg-current transition ${open ? "-translate-y-1 rotate-[-45deg]" : "translate-y-1.5"}`} />
          </button>
        </div>

        <div
          className={`grid transition-all duration-400 md:hidden ${
            open ? "grid-rows-[1fr] border-t border-white/40" : "grid-rows-[0fr]"
          }`}
        >
          <div className="overflow-hidden">
            <nav className="flex flex-col gap-2 px-4 py-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white/60"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <Link href="/login" className="button-primary w-full text-sm" onClick={() => setOpen(false)}>
                Entrar
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
