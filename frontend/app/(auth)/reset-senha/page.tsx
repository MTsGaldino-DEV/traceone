"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function ResetSenhaPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // O link de convite/recuperação estabelece a sessão automaticamente a
    // partir do hash da URL (#access_token=...). Aguarda esse processo.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
      setCheckingSession(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setSessionReady(true);
        setCheckingSession(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setSaving(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw new Error(updateError.message);
      setSuccess(true);
      // Desloga e manda pro login: o usuário deve entrar de novo já com a senha nova.
      await supabase.auth.signOut();
      setTimeout(() => router.push("/login?resetok=1"), 1800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar a nova senha.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, #fff 1px, transparent 0)`,
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative w-full max-w-md px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black tracking-tight text-white" style={{ letterSpacing: "-0.04em" }}>
            TraceOne
            <span className="text-sinal-claro">.</span>
          </h1>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl px-8 py-10" style={{ boxShadow: "0 32px 64px rgba(0,0,0,0.4)" }}>
          {checkingSession ? (
            <p className="text-center text-sm text-aco">Verificando link...</p>
          ) : !sessionReady ? (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-tinta">Link inválido</h2>
              <p className="text-aco text-sm">
                Esse link de acesso é inválido ou expirou. Peça um novo convite ou solicite a recuperação de senha novamente na tela de login.
              </p>
              <button
                onClick={() => router.push("/login")}
                className="w-full py-3 rounded-lg font-semibold text-white text-sm"
                style={{ background: "linear-gradient(135deg, var(--color-sinal) 0%, var(--color-sinal-forte) 100%)" }}
              >
                Ir para o login
              </button>
            </div>
          ) : success ? (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-tinta">Senha definida!</h2>
              <p className="text-aco text-sm">Agora entre novamente com sua nova senha. Redirecionando para o login...</p>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-tinta">Defina sua senha</h2>
                <p className="text-aco text-sm mt-1">Escolha a senha que você vai usar para acessar o TraceOne</p>
              </div>

              {error && (
                <div className="mb-5 flex items-start gap-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="new-password" className="block text-sm font-semibold text-tinta mb-1.5">
                    Nova senha
                  </label>
                  <div className="relative">
                    <input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
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

                <div>
                  <label htmlFor="confirm-new-password" className="block text-sm font-semibold text-tinta mb-1.5">
                    Confirmar nova senha
                  </label>
                  <input
                    id="confirm-new-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a senha"
                    className="w-full px-4 py-2.5 rounded-lg border border-linha text-tinta placeholder-aco-claro text-sm transition-all outline-none focus:border-sinal focus:ring-2 focus:ring-sinal-fundo"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-3 rounded-lg font-semibold text-white text-sm transition-all duration-200 mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  style={{
                    background: saving ? "var(--color-sinal-claro)" : "linear-gradient(135deg, var(--color-sinal) 0%, var(--color-sinal-forte) 100%)",
                    boxShadow: saving ? "none" : "0 4px 14px rgba(37,99,235,0.4)",
                  }}
                >
                  {saving ? "Salvando..." : "Salvar senha"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
