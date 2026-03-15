"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { Usuario } from "@/lib/domain/types";

type TeamActionState = Record<string, boolean>;

function isPendingSeller(user: Usuario): boolean {
  return user.rol === "vendedor" && !user.activo && Boolean(user.otp_expira);
}

export function TeamManagementClient({ initialUsers }: { initialUsers: Usuario[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [verifyTarget, setVerifyTarget] = useState<Usuario | null>(null);
  const [saving, setSaving] = useState(false);
  const [rowLoading, setRowLoading] = useState<TeamActionState>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [puedeRegistrarCostos, setPuedeRegistrarCostos] = useState(false);
  const [codigoOtp, setCodigoOtp] = useState("");

  const stats = useMemo(
    () => ({
      activeCount: initialUsers.filter((user) => user.activo).length,
      sellerCount: initialUsers.filter((user) => user.rol === "vendedor").length,
      pendingCount: initialUsers.filter((user) => isPendingSeller(user)).length,
    }),
    [initialUsers],
  );
  const canCreateSeller = nombre.trim().length >= 2 && telefono.trim().length >= 8;

  async function createSeller() {
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch("/api/equipo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          telefono,
          puedeRegistrarCostos,
        }),
      });

      const payload = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudo crear el vendedor");
      }

      setOpen(false);
      setNombre("");
      setTelefono("");
      setPuedeRegistrarCostos(false);
      setNotice(payload.message ?? "OTP enviado al vendedor para validar el número.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setSaving(false);
    }
  }

  async function patchUser(
    userId: string,
    patch: { activo?: boolean; puedeRegistrarCostos?: boolean },
  ) {
    setRowLoading((state) => ({ ...state, [userId]: true }));
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`/api/equipo/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudo actualizar el vendedor");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setRowLoading((state) => ({ ...state, [userId]: false }));
    }
  }

  async function resendOtp(userId: string) {
    setRowLoading((state) => ({ ...state, [userId]: true }));
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`/api/equipo/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resend_otp" }),
      });

      const payload = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudo reenviar el OTP");
      }

      setNotice(payload.message ?? "OTP reenviado.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setRowLoading((state) => ({ ...state, [userId]: false }));
    }
  }

  async function verifySeller() {
    if (!verifyTarget) {
      return;
    }

    setRowLoading((state) => ({ ...state, [verifyTarget.id]: true }));
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`/api/equipo/${verifyTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify_otp", codigo: codigoOtp }),
      });

      const payload = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudo verificar el OTP");
      }

      setNotice(payload.message ?? "Vendedor verificado.");
      setVerifyTarget(null);
      setCodigoOtp("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setRowLoading((state) => ({ ...state, [verifyTarget.id]: false }));
    }
  }

  async function deleteSeller(user: Usuario) {
    const confirmed = window.confirm(`Vas a eliminar a ${user.nombre ?? user.telefono}. Esta acción no se puede deshacer.`);
    if (!confirmed) {
      return;
    }

    setRowLoading((state) => ({ ...state, [user.id]: true }));
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`/api/equipo/${user.id}`, {
        method: "DELETE",
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudo eliminar el vendedor");
      }

      setNotice("Vendedor eliminado.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setRowLoading((state) => ({ ...state, [user.id]: false }));
    }
  }

  return (
    <>
      <section className="grid gap-5 md:grid-cols-3">
        {[
          ["Miembros activos", stats.activeCount.toString(), "Sesiones y registro habilitado"],
          ["Vendedores", stats.sellerCount.toString(), "Números operativos del equipo"],
          ["Pendientes OTP", stats.pendingCount.toString(), "Números que aún no fueron confirmados"],
        ].map(([label, value, note]) => (
          <article key={label} className="glass-panel stat-card rounded-[2.2rem]">
            <p className="text-sm font-semibold text-slate-500">{label}</p>
            <p className="mt-4 text-4xl font-bold text-[var(--brand-ink)]">{value}</p>
            <p className="mt-3 text-sm text-slate-500">{note}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--brand-ink)]">Equipo autorizado</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">Cada vendedor debe confirmar su número con un OTP antes de quedar habilitado para operar.</p>
        </div>
        <button type="button" className="button-primary px-6 py-3 text-sm" onClick={() => setOpen(true)}>
          Agregar vendedor
        </button>
      </section>

      {error ? <p className="mt-4 rounded-[1.25rem] bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">{error}</p> : null}
      {notice ? <p className="mt-4 rounded-[1.25rem] bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{notice}</p> : null}

      <section className="mt-6 glass-panel-strong overflow-hidden rounded-[2.5rem]">
        <div className="overflow-x-auto">
          <table className="data-table min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/30 bg-white/30">
                <th className="px-6 py-4">Miembro</th>
                <th className="px-6 py-4">Rol</th>
                <th className="px-6 py-4">WhatsApp</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Costos</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {initialUsers.map((user) => (
                <tr key={user.id} className="border-b border-white/20 last:border-b-0">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#d9f99d,#fef08a)] font-bold text-[var(--brand-ink)]">
                        {(user.nombre ?? "SN").slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-[var(--brand-ink)]">{user.nombre ?? "Sin nombre"}</p>
                        <p className="text-xs text-slate-400">{user.rol === "dueno" ? "Propietario" : "Vendedor autorizado"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`metric-pill ${user.rol === "dueno" ? "metric-pill-neutral" : "metric-pill-positive"}`}>{user.rol}</span>
                  </td>
                  <td className="px-6 py-5 font-mono text-slate-600">{user.telefono}</td>
                  <td className="px-6 py-5">
                    {user.rol === "dueno" ? (
                      <span className="metric-pill metric-pill-positive">Activo</span>
                    ) : isPendingSeller(user) ? (
                      <span className="metric-pill metric-pill-neutral">Pendiente OTP</span>
                    ) : (
                      <span className={`metric-pill ${user.activo ? "metric-pill-positive" : "metric-pill-negative"}`}>{user.activo ? "Activo" : "Pausado"}</span>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    <span className={`metric-pill ${user.puede_registrar_costos ? "metric-pill-positive" : "metric-pill-neutral"}`}>
                      {user.puede_registrar_costos ? "Permitido" : "Bloqueado"}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    {user.rol === "dueno" ? (
                      <div className="flex justify-end">
                        <span className="metric-pill metric-pill-neutral">Sin cambios</span>
                      </div>
                    ) : isPendingSeller(user) ? (
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setVerifyTarget(user);
                            setCodigoOtp("");
                            setError(null);
                            setNotice(null);
                          }}
                          disabled={rowLoading[user.id]}
                          className="button-secondary px-4 py-2 text-xs"
                        >
                          Verificar OTP
                        </button>
                        <button
                          type="button"
                          onClick={() => void resendOtp(user.id)}
                          disabled={rowLoading[user.id]}
                          className="button-secondary px-4 py-2 text-xs"
                        >
                          Reenviar OTP
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteSeller(user)}
                          disabled={rowLoading[user.id]}
                          className="rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Eliminar
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => void patchUser(user.id, { activo: !user.activo })}
                          disabled={rowLoading[user.id]}
                          className="button-secondary px-4 py-2 text-xs"
                        >
                          {user.activo ? "Pausar" : "Reactivar"}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void patchUser(user.id, {
                              puedeRegistrarCostos: !user.puede_registrar_costos,
                            })
                          }
                          disabled={rowLoading[user.id]}
                          className="button-secondary px-4 py-2 text-xs"
                        >
                          {user.puede_registrar_costos ? "Quitar costos" : "Permitir costos"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteSeller(user)}
                          disabled={rowLoading[user.id]}
                          className="rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Eliminar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {open ? (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/25 p-4 backdrop-blur-sm">
          <div className="glass-panel-strong w-full max-w-lg rounded-[2rem] p-6 shadow-2xl shadow-slate-900/10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Equipo</p>
                <h3 className="mt-2 text-2xl font-bold text-[var(--brand-ink)]">Agregar vendedor</h3>
                <p className="mt-2 text-sm text-slate-500">Le enviaremos un OTP por WhatsApp para confirmar que el número es real.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full p-2 text-slate-400 transition hover:bg-white/60 hover:text-slate-700">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              </button>
            </div>

            <form
              className="mt-6 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void createSeller();
              }}
            >
              <div>
                <label className="mb-2 ml-1 block text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Nombre</label>
                <input
                  value={nombre}
                  onChange={(event) => setNombre(event.target.value)}
                  placeholder="Camila Torres"
                  className="w-full rounded-[1.2rem] border border-white/60 bg-white/65 px-4 py-3 text-sm text-slate-700 outline-none"
                />
              </div>
              <div>
                <label className="mb-2 ml-1 block text-xs font-bold uppercase tracking-[0.22em] text-slate-400">WhatsApp</label>
                <input
                  value={telefono}
                  onChange={(event) => setTelefono(event.target.value)}
                  placeholder="+57 300 123 4567"
                  className="w-full rounded-[1.2rem] border border-white/60 bg-white/65 px-4 py-3 text-sm text-slate-700 outline-none"
                />
              </div>
              <label className="flex items-center gap-3 rounded-[1.2rem] bg-white/55 px-4 py-3 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={puedeRegistrarCostos}
                  onChange={(event) => setPuedeRegistrarCostos(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[var(--brand-ink)]"
                />
                Permitir que también registre costos
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="button-secondary px-5 py-3 text-sm">
                  Cancelar
                </button>
                <button type="submit" disabled={saving || !canCreateSeller} className="button-primary px-5 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60">
                  {saving ? "Enviando OTP..." : "Enviar verificación"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {verifyTarget ? (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/25 p-4 backdrop-blur-sm">
          <div className="glass-panel-strong w-full max-w-md rounded-[2rem] p-6 shadow-2xl shadow-slate-900/10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Verificación</p>
                <h3 className="mt-2 text-2xl font-bold text-[var(--brand-ink)]">Confirmar vendedor</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Ingresa el OTP que recibió <strong>{verifyTarget.nombre ?? verifyTarget.telefono}</strong> en {verifyTarget.telefono}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setVerifyTarget(null);
                  setCodigoOtp("");
                }}
                className="rounded-full p-2 text-slate-400 transition hover:bg-white/60 hover:text-slate-700"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              </button>
            </div>

            <form
              className="mt-6 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void verifySeller();
              }}
            >
              <div>
                <label className="mb-2 ml-1 block text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Código OTP</label>
                <input
                  value={codigoOtp}
                  onChange={(event) => setCodigoOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  inputMode="numeric"
                  className="w-full rounded-[1.2rem] border border-white/60 bg-white/65 px-4 py-3 text-center text-lg tracking-[0.4em] text-slate-700 outline-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setVerifyTarget(null);
                    setCodigoOtp("");
                  }}
                  className="button-secondary px-5 py-3 text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={codigoOtp.length !== 6 || rowLoading[verifyTarget.id]}
                  className="button-primary px-5 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {rowLoading[verifyTarget.id] ? "Verificando..." : "Activar vendedor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
