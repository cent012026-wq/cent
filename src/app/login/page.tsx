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
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-black/30">
        <h1 className="mb-2 text-2xl font-semibold text-cyan-300">cent Login</h1>
        <p className="mb-5 text-sm text-slate-400">Accede con OTP enviado a tu WhatsApp.</p>

        <label className="mb-2 block text-xs uppercase tracking-wide text-slate-400">Teléfono</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+573001234567"
          className="mb-4 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none ring-cyan-400 focus:ring"
        />

        {step === "otp" && (
          <>
            <label className="mb-2 block text-xs uppercase tracking-wide text-slate-400">OTP</label>
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="123456"
              className="mb-4 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none ring-cyan-400 focus:ring"
            />
          </>
        )}

        {error && <p className="mb-4 text-sm text-rose-300">{error}</p>}

        {step === "phone" ? (
          <button
            type="button"
            disabled={loading}
            onClick={requestOtp}
            className="w-full rounded-lg bg-cyan-500 px-3 py-2 font-medium text-slate-950 disabled:opacity-50"
          >
            {loading ? "Enviando..." : "Enviar OTP"}
          </button>
        ) : (
          <button
            type="button"
            disabled={loading}
            onClick={verifyOtp}
            className="w-full rounded-lg bg-cyan-500 px-3 py-2 font-medium text-slate-950 disabled:opacity-50"
          >
            {loading ? "Verificando..." : "Entrar"}
          </button>
        )}
      </div>
    </main>
  );
}
