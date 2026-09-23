"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  PlusCircle,
  UploadCloud,
  CheckSquare,
  AlarmClockCheck,
  Copy,
  Users,
  Contact,
  ShieldAlert,
  Bot,
  LogOut,
  KeyRound,
  X,
} from "lucide-react";
import { Logo } from "../../components/Logo";
import { supabase } from "../../lib/supabase";
import type { Profile } from "../../lib/supabase";
import { logout, changeOwnPassword } from "../../lib/api";
import { canManageColaboradores, canManageUsers, isAdmin, roleLabels } from "../../lib/permissions";

const navItems = [
  { label: "Lista de Medidores", href: "/dashboard", icon: LayoutDashboard, despachante: true },
  { label: "Lançamento Manual", href: "/dashboard/lancamento", icon: PlusCircle, despachante: false },
  { label: "Importar Relatório", href: "/dashboard/importacao", icon: UploadCloud, despachante: false },
  { label: "Conferência", href: "/dashboard/conferencia", icon: CheckSquare, despachante: false },
  { label: "Conferência +45 dias", href: "/dashboard/conferencia-45dias", icon: AlarmClockCheck, despachante: false },
  { label: "Duplicidade", href: "/dashboard/duplicidade", icon: Copy, despachante: false },
];

// Visível pra quem escreve no sistema, incluindo o almoxarifado
const colaboradoresNavItems = [
  { label: "Gestão de Colaboradores", href: "/dashboard/colaboradores", icon: Contact },
];

// Visível apenas de supervisor pra cima na hierarquia
const usuariosNavItems = [
  { label: "Gestão de Usuários", href: "/dashboard/usuarios", icon: Users },
];

// Visível só pra ADMIN
const adminNavItems = [
  { label: "Recuperação de Dados", href: "/dashboard/recuperacao-incidente", icon: ShieldAlert },
  { label: "Automação GDIS", href: "/dashboard/automacao-gdis", icon: Bot },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    // Verificar sessão ativa
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/login");
        return;
      }

      // Buscar profile do usuário
      supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single()
        .then(({ data }) => {
          if (data) setProfile(data as Profile);
        });
    });

    // Escutar mudanças de sessão (logout em outra aba, expiração, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/login");
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const isDespachante = profile?.role === "DESPACHANTE";
  const visibleNavItems = isDespachante ? navItems.filter((n) => n.despachante) : navItems;
  const withColaboradores = canManageColaboradores(profile?.role)
    ? [...visibleNavItems, ...colaboradoresNavItems]
    : visibleNavItems;
  const withGestao = canManageUsers(profile?.role)
    ? [...withColaboradores, ...usuariosNavItems]
    : withColaboradores;
  const allNavItems = isAdmin(profile?.role) ? [...withGestao, ...adminNavItems] : withGestao;

  useEffect(() => {
    if (!profile) return;
    const allowed = allNavItems.some(
      (n) => pathname === n.href || (n.href !== "/dashboard" && pathname.startsWith(n.href + "/"))
    );
    if (!allowed) router.replace("/dashboard");
  }, [profile, pathname]);

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const displayName = profile?.name ?? "Usuário";
  const displayRole = profile?.role ? (roleLabels[profile.role] ?? profile.role) : "Carregando...";

  // Trocar a própria senha
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
    setPasswordSuccess(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");

    if (newPassword.length < 6) {
      setPasswordError("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("As senhas não coincidem.");
      return;
    }

    setChangingPassword(true);
    try {
      await changeOwnPassword(currentPassword, newPassword);
      setPasswordSuccess(true);
      setTimeout(closePasswordModal, 1500);
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : "Erro ao trocar senha.");
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {/* ── Sidebar ── */}
      <aside
        className="flex flex-col w-60 flex-shrink-0 text-white border-r border-[#1e2942]"
        style={{
          background: "linear-gradient(180deg, var(--color-noite-alto) 0%, var(--color-noite) 100%)",
        }}
      >
        {/* Logo */}
        <div className="h-14 flex items-center px-5 border-b border-white/10">
          <Logo tema="escuro" className="h-[22px] w-auto" />
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {allNavItems.map(({ label, href, icon: Icon }) => {
            const isActive =
              pathname === href ||
              (href !== "/dashboard" && pathname.startsWith(href + "/"));
            return (
              <Link
                key={href}
                href={href}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${isActive
                    ? "bg-sinal/30 text-white font-semibold border border-sinal/30 shadow-sm"
                    : "text-sinal-fundo/70 hover:bg-white/10 hover:text-white"
                  }`}
              >
                <Icon
                  size={16}
                  className={`flex-shrink-0 transition-colors ${isActive
                      ? "text-sinal-claro"
                      : "text-sinal-claro/50 group-hover:text-sinal-fundo"
                    }`}
                />
                {label}
                {isActive && (
                  <span className="ml-auto size-[7px] rounded-full bg-sinal" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User + Logout */}
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-white/5 border border-white/5">
            <div className="w-7 h-7 rounded-full bg-sinal flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="text-white text-xs font-bold uppercase">
                {displayName.charAt(0)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {displayName}
              </p>
              <p className="text-xs text-sinal-fundo/60">{displayRole}</p>
            </div>
            <button
              onClick={() => setShowPasswordModal(true)}
              title="Alterar senha"
              className="p-1.5 rounded-md text-sinal-fundo/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              <KeyRound size={15} />
            </button>
            <button
              onClick={handleLogout}
              title="Sair"
              className="p-1.5 rounded-md text-sinal-fundo/60 hover:text-red-400 hover:bg-red-500/20 transition-colors"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center px-6 flex-shrink-0 shadow-xs">
          <h1 className="text-sm font-bold text-slate-900">
            {allNavItems.find(
              (n) =>
                pathname === n.href ||
                (n.href !== "/dashboard" && pathname.startsWith(n.href + "/"))
            )?.label ?? "Dashboard"}
          </h1>
        </header>

        <div className="flex-1 overflow-y-auto">{children}</div>
      </main>

      {/* ── Modal: Alterar senha ── */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-nevoa">
              <h3 className="text-sm font-bold text-tinta">Alterar Senha</h3>
              <button onClick={closePasswordModal} className="text-aco-claro hover:text-tinta">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="p-5 space-y-3">
              {passwordError && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                  Senha alterada com sucesso!
                </div>
              )}

              <div>
                <label className="text-xs text-aco block mb-1">Senha atual</label>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full h-9 px-3 text-sm border border-linha rounded-lg focus:outline-none focus:ring-1 focus:ring-sinal-claro"
                />
              </div>
              <div>
                <label className="text-xs text-aco block mb-1">Nova senha</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full h-9 px-3 text-sm border border-linha rounded-lg focus:outline-none focus:ring-1 focus:ring-sinal-claro"
                />
              </div>
              <div>
                <label className="text-xs text-aco block mb-1">Confirmar nova senha</label>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full h-9 px-3 text-sm border border-linha rounded-lg focus:outline-none focus:ring-1 focus:ring-sinal-claro"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closePasswordModal}
                  className="px-4 py-2 text-xs font-medium text-aco border border-linha rounded-lg hover:bg-nevoa transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="px-4 py-2 text-xs font-medium text-white bg-sinal rounded-lg hover:bg-sinal-forte transition-colors disabled:opacity-50"
                >
                  {changingPassword ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
