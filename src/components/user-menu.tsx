"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function phoneLabel(phone: string): string {
  return phone.startsWith("+") ? phone : `+${phone}`;
}

function initialsFromPhone(phone: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  return digits.slice(-2).padStart(2, "0");
}

export function UserMenu({ telefono }: { telefono: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="glass-panel flex items-center gap-3 rounded-full px-2 py-2 pr-4"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-lime)] font-bold text-[var(--brand-ink)]">
          {initialsFromPhone(telefono)}
        </div>
        <div className="text-left">
          <p className="text-sm font-semibold text-[var(--brand-ink)]">Mi cuenta</p>
          <p className="text-xs text-slate-500">{phoneLabel(telefono)}</p>
        </div>
        <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24">
          <path d="m6 9 6 6 6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      </button>

      {open ? (
        <div className="glass-panel-strong absolute right-0 top-[calc(100%+0.75rem)] z-20 w-64 rounded-[1.5rem] p-3 shadow-2xl shadow-slate-900/10">
          <div className="rounded-[1.2rem] bg-white/60 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Sesión activa</p>
            <p className="mt-2 text-sm font-semibold text-[var(--brand-ink)]">{phoneLabel(telefono)}</p>
          </div>

          <button
            type="button"
            onClick={() => void logout()}
            disabled={loading}
            className="mt-3 flex w-full items-center justify-between rounded-[1.2rem] px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span>{loading ? "Cerrando..." : "Cerrar sesión"}</span>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24">
              <path d="M15 12H3m0 0 4-4m-4 4 4 4m7-9h4a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
          </button>
        </div>
      ) : null}
    </div>
  );
}
