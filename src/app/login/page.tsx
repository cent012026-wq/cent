"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestOtp() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefono: phone }),
      });

      if (!response.ok) {
        throw new Error("No se pudo enviar el código OTP");
      }

      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefono: phone, codigo: otp }),
      });

      if (!response.ok) {
        const json = (await response.json()) as { reason?: string };
        throw new Error(json.reason ?? "Código inválido");
      }

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="watercolor-shell flex min-h-screen items-center justify-center px-4 py-12">
      <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="glass-panel-strong relative overflow-hidden rounded-[2.75rem] p-8 md:p-10">
          <div className="absolute -right-10 top-0 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(136,196,62,0.32),transparent_70%)]" />
          <div className="absolute -bottom-6 left-0 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(125,211,252,0.25),transparent_70%)]" />
          <div className="relative">
            <p className="text-5xl font-bold tracking-tighter text-[var(--brand-ink)]">
              cent<span className="text-lime-600">.</span>
            </p>
            <h1 className="mt-8 text-4xl font-bold tracking-tight text-[var(--brand-ink)] md:text-5xl">
              Entra con tu número de WhatsApp.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-slate-600 md:text-lg">
              El acceso está pensado para dueños y administradores. Te enviamos un OTP por WhatsApp para mantener la entrada simple y segura.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                ["1", "Escribes tu número"],
                ["2", "Recibes el código"],
                ["3", "Entras al panel"],
              ].map(([num, label]) => (
                <div key={num} className="rounded-[1.75rem] bg-white/60 p-4">
                  <p className="text-sm font-black text-lime-700">0{num}</p>
                  <p className="mt-2 text-sm font-semibold text-[var(--brand-ink)]">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="glass-panel-strong rounded-[2.75rem] p-8 md:p-10">
          <div className="mb-8 flex items-center justify-between gap-4">
            <div>
              <div className="eyebrow">Acceso OTP</div>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                {step === "phone"
                  ? "Solicita un código de verificación por WhatsApp."
                  : "Escribe el código de 6 dígitos que te llegó a tu chat."}
              </p>
            </div>
            <div className="metric-pill metric-pill-neutral">Paso {step === "phone" ? "1/2" : "2/2"}</div>
          </div>

          <form
            className="space-y-6"
            onSubmit={(event) => {
              event.preventDefault();
              if (step === "phone") {
                void requestOtp();
                return;
              }
              void verifyOtp();
            }}
          >
            <div>
              <label className="mb-2 ml-1 block text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Número de WhatsApp</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+573001234567"
                className="w-full rounded-[1.35rem] border border-white/60 bg-white/65 px-5 py-4 text-base text-slate-800 outline-none ring-0 transition focus:border-lime-300 focus:bg-white"
              />
            </div>

            {step === "otp" ? (
              <div>
                <label className="mb-2 ml-1 block text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Código OTP</label>
                <input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  className="w-full rounded-[1.35rem] border border-white/60 bg-white/65 px-5 py-4 text-base tracking-[0.35em] text-slate-800 outline-none transition focus:border-lime-300 focus:bg-white"
                />
              </div>
            ) : null}

            {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">{error}</p> : null}

            <button type="submit" disabled={loading} className="button-primary w-full py-4 text-base disabled:cursor-not-allowed disabled:opacity-60">
              {step === "phone" ? (loading ? "Enviando código..." : "Solicitar código OTP") : loading ? "Verificando..." : "Entrar al panel"}
            </button>
          </form>

          <div className="mt-8 flex items-center justify-between gap-4 rounded-[1.75rem] bg-white/55 px-5 py-4 text-sm text-slate-500">
            <span>Solo dueños activos pueden recibir OTP.</span>
            <span className="font-mono text-xs text-slate-400">whatsapp-first auth</span>
          </div>
        </section>
      </div>
    </main>
  );
}
