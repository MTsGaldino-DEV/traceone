"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../../lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);

    try {
      await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, name: fullName }),
      });

      router.push("/login");
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Erro ao criar conta. Tente novamente.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex">
      {/* ── Left panel ── */}
      <div
        className="hidden lg:flex flex-col justify-between w-1/2 px-12 py-12 relative overflow-hidden"
        style={{
          background: "linear-gradient(160deg, #060c24 0%, #0d1b4b 60%, #1a2a6c 100%)",
        }}
      >
        {/* Background subtle grid */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, #fff 1px, transparent 0)`,
            backgroundSize: "40px 40px",
          }}
        />

        {/* Decorative blobs */}
        <div
          className="absolute top-1/4 -left-24 w-80 h-80 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #2563eb 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-1/4 -right-16 w-64 h-64 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #3b82f6 0%, transparent 70%)" }}
        />

        {/* Logo */}
        <div className="relative">
          <h1
            className="text-2xl font-black text-white tracking-tight"
            style={{ letterSpacing: "-0.04em" }}
          >
            TraceOne
            <span className="text-blue-400">.</span>
          </h1>
        </div>

        {/* Center tagline */}
        <div className="relative flex-1 flex flex-col justify-center py-12">
          <p
            className="text-white font-light leading-tight max-w-sm"
            style={{
              fontStyle: "italic",
              fontSize: "clamp(1.6rem, 2.5vw, 2.25rem)",
              lineHeight: 1.2,
            }}
          >
            Bem-vindo.
            <br />
            <span className="opacity-80">
              Gerencie seus ativos operacionais com TraceOne.
            </span>
          </p>

          <div className="mt-8 flex items-center gap-2">
            <div className="w-8 h-px bg-blue-400 opacity-60" />
            <span className="text-blue-200 text-xs font-medium tracking-widest uppercase opacity-60">
              Controle de Estoque
            </span>
          </div>

          {/* Feature pills */}
          <div className="mt-10 flex flex-col gap-3">
            {[
              "Gestão de estoque em tempo real",
              "Rastreamento de ativos por QR Code",
              "Relatórios e dashboards inteligentes",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-500 bg-opacity-20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-blue-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-blue-100 text-sm opacity-70">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom note */}
        <div className="relative">
          <p className="text-xs text-blue-200 opacity-30">
            © {new Date().getFullYear()} TraceOne · Sistema de uso interno
          </p>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex items-center justify-center bg-white px-6 py-12 lg:rounded-l-none">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-2xl font-black text-[#0f172a]" style={{ letterSpacing: "-0.04em" }}>
              TraceOne<span className="text-blue-600">.</span>
            </h1>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#0f172a]">
              Criar uma conta
            </h2>
            <p className="text-[#64748b] text-sm mt-1">
              Preencha os dados abaixo para criar seu acesso
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
              <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-5">
            {/* Nome Completo */}
            <div>
              <label
                htmlFor="register-name"
                className="block text-sm font-semibold text-[#0f172a] mb-1.5"
              >
                Nome completo
              </label>
              <input
                id="register-name"
                type="text"
                autoComplete="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="João da Silva"
                className="w-full px-4 py-2.5 rounded-lg border border-[#e2e8f0] text-[#0f172a] placeholder-[#94a3b8] text-sm transition-all outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="register-email"
                className="block text-sm font-semibold text-[#0f172a] mb-1.5"
              >
                Email
              </label>
              <input
                id="register-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full px-4 py-2.5 rounded-lg border border-[#e2e8f0] text-[#0f172a] placeholder-[#94a3b8] text-sm transition-all outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Senha */}
            <div>
              <label
                htmlFor="register-password"
                className="block text-sm font-semibold text-[#0f172a] mb-1.5"
              >
                Senha
              </label>
              <div className="relative">
                <input
                  id="register-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-4 py-2.5 pr-11 rounded-lg border border-[#e2e8f0] text-[#0f172a] placeholder-[#94a3b8] text-sm transition-all outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#64748b] transition-colors"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? (
                    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Confirmar Senha */}
            <div>
              <label
                htmlFor="register-confirm-password"
                className="block text-sm font-semibold text-[#0f172a] mb-1.5"
              >
                Confirmar senha
              </label>
              <div className="relative">
                <input
                  id="register-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                  className="w-full px-4 py-2.5 pr-11 rounded-lg border border-[#e2e8f0] text-[#0f172a] placeholder-[#94a3b8] text-sm transition-all outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-100"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#64748b] transition-colors"
                  aria-label={showConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showConfirmPassword ? (
                    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              id="register-submit"
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg font-semibold text-white text-sm transition-all duration-200 mt-2 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              style={{
                background: loading
                  ? "#93c5fd"
                  : "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                boxShadow: loading ? "none" : "0 4px 14px rgba(37,99,235,0.4)",
              }}
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Criando conta...
                </>
              ) : (
                "Criar conta"
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
