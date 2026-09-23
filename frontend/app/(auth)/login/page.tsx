"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { login, requestPasswordReset } from "../../../lib/api";
import { supabase } from "../../../lib/supabase";
import { DEFAULT_PASSWORD } from "../../../lib/permissions";
import { Logo } from "../../../components/Logo";

type Mode = "login" | "forgot" | "first-access";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetOk = searchParams.get("resetok") === "1";

  const [mode, setMode] = useState<Mode>("login");

  // Login normal
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Esqueci minha senha
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState("");

  // Primeiro acesso (senha temporária → define a própria senha)
  const [firstEmail, setFirstEmail] = useState("");
  const [firstTempPassword, setFirstTempPassword] = useState(DEFAULT_PASSWORD);
  const [firstLoading, setFirstLoading] = useState(false);
  const [firstError, setFirstError] = useState("");

  const backToLogin = () => {
    setMode("login");
    setForgotEmail("");
    setForgotSent(false);
    setForgotError("");
    setFirstEmail("");
    setFirstTempPassword(DEFAULT_PASSWORD);
    setFirstError("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Erro ao realizar login. Verifique suas credenciais.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    setForgotLoading(true);
    try {
      await requestPasswordReset(forgotEmail);
      setForgotSent(true);
    } catch (err: unknown) {
      setForgotError(err instanceof Error ? err.message : "Erro ao enviar email de recuperação.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleFirstAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setFirstError("");
    setFirstLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: firstEmail,
        password: firstTempPassword,
      });
      if (signInError) {
        throw new Error("Email ou senha temporária inválidos. Se você já definiu sua senha antes, use o login normal.");
      }
      router.push("/reset-senha");
    } catch (err: unknown) {
      setFirstError(err instanceof Error ? err.message : "Erro ao validar primeiro acesso.");
    } finally {
      setFirstLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="relative w-full max-w-md px-4">
        {/* Logo above card */}
        <div className="text-center mb-8">
          <Logo tema="escuro" className="mx-auto h-9 w-auto" />
          <p className="text-sinal-fundo text-sm mt-1 font-medium opacity-70">
            Controle de medidores
          </p>
        </div>

        {/* Card */}
        <div
          className="bg-white rounded-2xl shadow-2xl px-8 py-10"
          style={{ boxShadow: "0 32px 64px rgba(0,0,0,0.4)" }}
        >
          {mode === "forgot" ? (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-tinta">Recuperar senha</h2>
                <p className="text-aco text-sm mt-1">
                  Informe seu email e enviaremos um link para redefinir sua senha
                </p>
              </div>

              {forgotError && (
                <div className="mb-5 flex items-start gap-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                  <p className="text-red-700 text-sm">{forgotError}</p>
                </div>
              )}

              {forgotSent ? (
                <div className="space-y-5">
                  <div className="flex items-start gap-3 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
                    <p className="text-emerald-700 text-sm">
                      Se o email <strong>{forgotEmail}</strong> estiver cadastrado, um link de recuperação foi enviado. Confira sua caixa de entrada.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={backToLogin}
                    className="w-full py-3 rounded-lg font-semibold text-white text-sm transition-all duration-200"
                    style={{
                      background: "linear-gradient(135deg, var(--color-sinal) 0%, var(--color-sinal-forte) 100%)",
                      boxShadow: "0 4px 14px rgba(37,99,235,0.4)",
                    }}
                  >
                    Voltar para o login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-5">
                  <div>
                    <label htmlFor="forgot-email" className="block text-sm font-semibold text-tinta mb-1.5">
                      Email
                    </label>
                    <input
                      id="forgot-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="w-full px-4 py-2.5 rounded-lg border border-linha text-tinta placeholder-aco-claro text-sm transition-all outline-none focus:border-sinal focus:ring-2 focus:ring-sinal-fundo"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full py-3 rounded-lg font-semibold text-white text-sm transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    style={{
                      background: forgotLoading
                        ? "var(--color-sinal-claro)"
                        : "linear-gradient(135deg, var(--color-sinal) 0%, var(--color-sinal-forte) 100%)",
                      boxShadow: forgotLoading ? "none" : "0 4px 14px rgba(37,99,235,0.4)",
                    }}
                  >
                    {forgotLoading ? "Enviando..." : "Enviar link de recuperação"}
                  </button>

                  <button
                    type="button"
                    onClick={backToLogin}
                    className="w-full text-center text-sm text-aco hover:text-tinta transition-colors"
                  >
                    Voltar para o login
                  </button>
                </form>
              )}
            </>
          ) : mode === "first-access" ? (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-tinta">Primeiro acesso</h2>
                <p className="text-aco text-sm mt-1">
                  Entre com seu email e a senha temporária padrão (<strong>{DEFAULT_PASSWORD}</strong>) pra definir sua própria senha
                </p>
              </div>

              {firstError && (
                <div className="mb-5 flex items-start gap-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                  <p className="text-red-700 text-sm">{firstError}</p>
                </div>
              )}

              <form onSubmit={handleFirstAccess} className="space-y-5">
                <div>
                  <label htmlFor="first-email" className="block text-sm font-semibold text-tinta mb-1.5">
                    Email
                  </label>
                  <input
                    id="first-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={firstEmail}
                    onChange={(e) => setFirstEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full px-4 py-2.5 rounded-lg border border-linha text-tinta placeholder-aco-claro text-sm transition-all outline-none focus:border-sinal focus:ring-2 focus:ring-sinal-fundo"
                  />
                </div>
                <div>
                  <label htmlFor="first-temp-password" className="block text-sm font-semibold text-tinta mb-1.5">
                    Senha temporária
                  </label>
                  <input
                    id="first-temp-password"
                    type="text"
                    required
                    value={firstTempPassword}
                    onChange={(e) => setFirstTempPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-linha text-tinta placeholder-aco-claro text-sm transition-all outline-none focus:border-sinal focus:ring-2 focus:ring-sinal-fundo"
                  />
                </div>

                <button
                  type="submit"
                  disabled={firstLoading}
                  className="w-full py-3 rounded-lg font-semibold text-white text-sm transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  style={{
                    background: firstLoading
                      ? "var(--color-sinal-claro)"
                      : "linear-gradient(135deg, var(--color-sinal) 0%, var(--color-sinal-forte) 100%)",
                    boxShadow: firstLoading ? "none" : "0 4px 14px rgba(37,99,235,0.4)",
                  }}
                >
                  {firstLoading ? "Verificando..." : "Continuar e definir senha"}
                </button>

                <button
                  type="button"
                  onClick={backToLogin}
                  className="w-full text-center text-sm text-aco hover:text-tinta transition-colors"
                >
                  Voltar para o login
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-tinta">
                  Entrar na sua conta
                </h2>
                <p className="text-aco text-sm mt-1">
                  Acesse o painel de controle do TraceOne
                </p>
              </div>

              {resetOk && (
                <div className="mb-5 flex items-start gap-3 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
                  <p className="text-emerald-700 text-sm">Senha definida com sucesso! Entre com sua nova senha.</p>
                </div>
              )}

              {/* Error message */}
              {error && (
                <div className="mb-5 flex items-start gap-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                  <svg
                    className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-5">
                {/* Email */}
                <div>
                  <label
                    htmlFor="login-email"
                    className="block text-sm font-semibold text-tinta mb-1.5"
                  >
                    Email
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full px-4 py-2.5 rounded-lg border border-linha text-tinta placeholder-aco-claro text-sm transition-all outline-none focus:border-sinal focus:ring-2 focus:ring-sinal-fundo"
                  />
                </div>

                {/* Senha */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="login-password"
                      className="block text-sm font-semibold text-tinta"
                    >
                      Senha
                    </label>
                    <button
                      type="button"
                      className="text-xs text-sinal font-semibold hover:text-sinal-forte transition-colors"
                      onClick={() => { setMode("forgot"); setForgotEmail(email); }}
                    >
                      Esqueci?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 pr-11 rounded-lg border border-linha text-tinta placeholder-aco-claro text-sm transition-all outline-none focus:border-sinal focus:ring-2 focus:ring-sinal-fundo"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-aco-claro hover:text-aco transition-colors"
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

                {/* Submit button */}
                <button
                  id="login-submit"
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-lg font-semibold text-white text-sm transition-all duration-200 mt-2 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  style={{
                    background: loading
                      ? "var(--color-sinal-claro)"
                      : "linear-gradient(135deg, var(--color-sinal) 0%, var(--color-sinal-forte) 100%)",
                    boxShadow: loading ? "none" : "0 4px 14px rgba(37,99,235,0.4)",
                  }}
                >
                  {loading ? (
                    <>
                      <svg
                        className="w-4 h-4 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Entrando...
                    </>
                  ) : (
                    "Entrar agora"
                  )}
                </button>
              </form>

              {/* Footer note */}
              <p className="text-center text-sm text-aco mt-6">
                É seu primeiro acesso?{" "}
                <button
                  type="button"
                  onClick={() => setMode("first-access")}
                  className="text-sinal font-semibold hover:text-sinal-forte transition-colors"
                >
                  Entrar com senha temporária
                </button>
              </p>
            </>
          )}
        </div>

        <p className="text-center text-xs text-sinal-fundo opacity-40 mt-6">
          © {new Date().getFullYear()} TraceOne. Sistema de uso interno.
        </p>
      </div>
    </main>
  );
}
