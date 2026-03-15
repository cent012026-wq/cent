"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { CentLogo } from "@/components/cent-logo";

const countries = [
  { value: "es", label: "España", dialCode: "+34", placeholder: "600 123 456" },
  { value: "mx", label: "México", dialCode: "+52", placeholder: "55 1234 5678" },
  { value: "co", label: "Colombia", dialCode: "+57", placeholder: "300 123 4567" },
  { value: "ar", label: "Argentina", dialCode: "+54", placeholder: "11 2345 6789" },
  { value: "cl", label: "Chile", dialCode: "+56", placeholder: "9 1234 5678" },
];

function digitsOnly(value: string): string {
  return value.replace(/[^\d]/g, "");
}

function normalizeVerifyReason(reason?: string): string {
  switch (reason) {
    case "not_found":
      return "No encontramos una solicitud válida para ese número. Vuelve a pedir el código.";
    case "expired":
      return "El código expiró. Solicita uno nuevo.";
    case "too_many_attempts":
      return "Se bloquearon temporalmente los intentos. Espera y vuelve a pedir un código.";
    case "invalid_code":
      return "El código no es válido.";
    default:
      return "No pudimos verificar el código.";
  }
}

interface OtpRequestPayload {
  ok: boolean;
  phone?: string;
  delivery?: "sent" | "not_sent";
  provider?: "kapso" | "meta";
  mode?: "login" | "signup";
  reason?: "send_failed" | "role_not_allowed" | "inactive";
  message?: string;
  debug?: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [country, setCountry] = useState(countries[2]);
  const [phoneInput, setPhoneInput] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpTrace, setOtpTrace] = useState<OtpRequestPayload | null>(null);

  const fullPhone = `${country.dialCode}${digitsOnly(phoneInput)}`;

  async function requestOtp() {
    setLoading(true);
    setError(null);
    setOtpTrace(null);

    try {
      const response = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefono: fullPhone }),
      });

      const payload = (await response.json()) as OtpRequestPayload;
      setOtpTrace(payload);

      if (!response.ok) {
        throw new Error(payload.message ?? "No se pudo enviar el código OTP");
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
        body: JSON.stringify({ telefono: fullPhone, codigo: otp }),
      });

      if (!response.ok) {
        const json = (await response.json()) as { reason?: string };
        throw new Error(normalizeVerifyReason(json.reason));
      }

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="watercolor-shell relative flex min-h-screen flex-col overflow-hidden bg-[#f6f6f8] px-4 py-12">
      <div className="absolute left-[-10%] top-[-10%] h-[500px] w-[500px] rounded-full bg-lime-300/40 blur-[90px]" />
      <div className="absolute bottom-[-10%] right-[-5%] h-[600px] w-[600px] rounded-full bg-[#3b2bee]/20 blur-[110px]" />
      <div className="absolute right-[10%] top-[20%] h-[300px] w-[300px] rounded-full bg-yellow-300/30 blur-[80px]" />
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center">
        <div className="mb-10 flex flex-col items-center gap-2">
          <CentLogo />
        </div>

        <div className="w-full max-w-md">
          <section className="glass-panel-strong rounded-[2rem] border border-white/50 px-7 py-8 shadow-2xl shadow-slate-900/10">
            <div className="mb-8 text-center">
              <h1 className="text-2xl font-bold text-slate-900">Bienvenido de nuevo</h1>
              <p className="mt-2 text-base text-slate-600">
                Accede a tu panel mediante WhatsApp. Si es tu primer acceso, creamos tu cuenta al pedir el código.
              </p>
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
              {step === "phone" ? (
                <>
                  <div className="space-y-2">
                    <label className="px-1 text-sm font-semibold text-slate-700">País</label>
                    <div className="relative">
                      <select
                        value={country.value}
                        onChange={(event) => {
                          const selected = countries.find((item) => item.value === event.target.value);
                          if (selected) {
                            setCountry(selected);
                          }
                        }}
                        className="w-full appearance-none rounded-xl border border-slate-200 bg-white/55 px-4 py-3.5 text-slate-900 outline-none transition-all focus:border-[#3b2bee] focus:ring-2 focus:ring-[#3b2bee]/20"
                      >
                        {countries.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label} ({item.dialCode})
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <path d="m6 9 6 6 6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="px-1 text-sm font-semibold text-slate-700">Número de WhatsApp</label>
                    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/55 px-4 py-3.5 focus-within:border-[#3b2bee] focus-within:ring-2 focus-within:ring-[#3b2bee]/20">
                      <div className="flex items-center gap-3 border-r border-slate-200 pr-3">
                        <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24">
                          <path d="M7 4h10a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm5 13.5h.01" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                        </svg>
                        <span className="font-semibold text-slate-700">{country.dialCode}</span>
                      </div>
                      <input
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        placeholder={country.placeholder}
                        type="tel"
                        className="w-full bg-transparent text-slate-900 outline-none placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-2xl bg-white/45 px-4 py-3 text-sm text-slate-600">
                    {otpTrace?.mode === "signup" ? (
                      <>
                        Creamos tu cuenta inicial para <span className="font-semibold text-slate-900">{fullPhone}</span> y
                        enviamos el código por WhatsApp.
                      </>
                    ) : (
                      <>
                        Enviamos el código a <span className="font-semibold text-slate-900">{fullPhone}</span>
                      </>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="px-1 text-sm font-semibold text-slate-700">Código OTP</label>
                    <input
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="123456"
                      className="w-full rounded-xl border border-slate-200 bg-white/55 px-4 py-3.5 text-center text-lg tracking-[0.35em] text-slate-900 outline-none transition-all focus:border-[#3b2bee] focus:ring-2 focus:ring-[#3b2bee]/20"
                    />
                  </div>
                </>
              )}

              {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">{error}</p> : null}

              <button
                type="submit"
                disabled={loading}
                className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-lime-300 to-yellow-300 px-6 py-4 font-bold text-slate-900 shadow-lg shadow-lime-300/30 transition-all duration-300 hover:from-lime-300 hover:to-[#3b2bee] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="relative z-10">
                  {step === "phone" ? (loading ? "Solicitando..." : "Solicitar Código OTP") : loading ? "Verificando..." : "Entrar al panel"}
                </span>
                <svg className="relative z-10 h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24">
                  <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              </button>
            </form>

            <div className="mt-8 border-t border-slate-200/50 pt-6 text-center">
              <p className="text-sm text-slate-600">
                No necesitas registro separado.
                <span className="ml-1 font-bold text-[#3b2bee]">Tu número crea la cuenta automáticamente.</span>
              </p>
            </div>
          </section>

          <div className="mt-8 flex flex-col items-center gap-6">
            <div className="glass-panel flex items-center gap-4 rounded-full border border-white/40 px-6 py-3 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#25D366]">
                  <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
                  </svg>
                </div>
                <span className="text-xs font-bold tracking-wider text-slate-700">WHATSAPP SYNC</span>
              </div>
              <div className="h-4 w-px bg-slate-300" />
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-[#3b2bee]" fill="none" viewBox="0 0 24 24">
                  <path d="M4 6h16v12H4zm5 0v12m10-7H4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
                <span className="text-xs font-bold tracking-wider text-slate-700">DASHBOARD</span>
              </div>
            </div>

            {otpTrace ? (
              <article className="glass-panel-strong w-full rounded-[1.75rem] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.22em] text-slate-400">Vista de bug</p>
                    <h2 className="mt-2 text-xl font-bold text-slate-900">Estado del envío OTP</h2>
                  </div>
                  <span className={`metric-pill ${otpTrace.ok ? "metric-pill-positive" : "metric-pill-negative"}`}>
                    {otpTrace.delivery === "sent" ? "Enviado" : "No enviado"}
                  </span>
                </div>
                <div className="mt-5 grid gap-3 text-sm md:grid-cols-2">
                  <div className="rounded-2xl bg-white/55 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Flujo</p>
                    <p className="mt-2 font-semibold capitalize text-slate-900">
                      {otpTrace.mode === "signup" ? "Alta inicial" : "Ingreso"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/55 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Número</p>
                    <p className="mt-2 font-semibold text-slate-900">{otpTrace.phone ?? fullPhone}</p>
                  </div>
                  <div className="rounded-2xl bg-white/55 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Proveedor</p>
                    <p className="mt-2 font-semibold capitalize text-slate-900">{otpTrace.provider ?? "kapso"}</p>
                  </div>
                  <div className="rounded-2xl bg-white/55 p-4 md:col-span-2">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Mensaje</p>
                    <p className="mt-2 font-semibold text-slate-900">{otpTrace.message ?? "Sin detalle"}</p>
                    {otpTrace.debug ? <p className="mt-3 break-all font-mono text-xs text-slate-500">{otpTrace.debug}</p> : null}
                  </div>
                </div>
              </article>
            ) : null}

            <p className="text-xs font-medium text-slate-500">Seguro. Rápido. Sin contraseñas.</p>
          </div>
        </div>
      </div>

      <footer className="relative z-10 mt-auto flex w-full items-center justify-between px-10 py-6 text-xs font-medium text-slate-400">
        <div className="flex gap-6">
          <span>Términos</span>
          <span>Privacidad</span>
          <span>Ayuda</span>
        </div>
        <div>© 2024 cent. Todos los derechos reservados.</div>
      </footer>
    </main>
  );
}
