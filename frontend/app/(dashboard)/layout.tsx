"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  PlusCircle,
  UploadCloud,
  CheckSquare,
  Users,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import type { Profile } from "../../lib/supabase";
import { logout } from "../../lib/api";
import { canManageUsers, roleLabels } from "../../lib/permissions";

const navItems = [
  { label: "Lista de Medidores", href: "/dashboard", icon: LayoutDashboard, despachante: true },
  { label: "Lançamento Manual", href: "/dashboard/lancamento", icon: PlusCircle, despachante: false },
  { label: "Importar Relatório", href: "/dashboard/importacao", icon: UploadCloud, despachante: false },
  { label: "Conferência", href: "/dashboard/conferencia", icon: CheckSquare, despachante: false },
];

const usuariosNavItem = { label: "Gestão de Usuários", href: "/dashboard/usuarios", icon: Users };

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
  const allNavItems = canManageUsers(profile?.role) ? [...visibleNavItems, usuariosNavItem] : visibleNavItems;

  useEffect(() => {
    if (!profile) return;
    const allowed = allNavItems.some(
      (n) => pathname === n.href || (n.href !== "/dashboard" && pathname.startsWith(n.href))
    );
    if (!allowed) router.replace("/dashboard");
  }, [profile, pathname]);

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const displayName = profile?.name ?? "Usuário";
  const displayRole = profile?.role ? (roleLabels[profile.role] ?? profile.role) : "Carregando...";

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {/* ── Sidebar ── */}
      <aside
        className="flex flex-col w-60 flex-shrink-0 text-white border-r border-[#1e2942]"
        style={{
          background: "linear-gradient(180deg, #0d1640 0%, #070c1f 100%)",
        }}
      >
        {/* Logo */}
        <div className="h-14 flex items-center px-5 border-b border-white/10">
          <span
            className="text-xl font-black text-white tracking-tight"
            style={{ letterSpacing: "-0.04em" }}
          >
            TraceOne
            <span className="text-blue-400">.</span>
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {allNavItems.map(({ label, href, icon: Icon }) => {
            const isActive =
              pathname === href ||
              (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${isActive
                    ? "bg-blue-600/30 text-white font-semibold border border-blue-500/30 shadow-sm"
                    : "text-blue-200/70 hover:bg-white/10 hover:text-white"
                  }`}
              >
                <Icon
                  size={16}
                  className={`flex-shrink-0 transition-colors ${isActive
                      ? "text-blue-400"
                      : "text-blue-300/50 group-hover:text-blue-200"
                    }`}
                />
                {label}
                {isActive && (
                  <ChevronRight size={14} className="ml-auto text-blue-400" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User + Logout */}
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-white/5 border border-white/5">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="text-white text-xs font-bold uppercase">
                {displayName.charAt(0)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {displayName}
              </p>
              <p className="text-xs text-blue-200/60">{displayRole}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Sair"
              className="p-1.5 rounded-md text-blue-200/60 hover:text-red-400 hover:bg-red-500/20 transition-colors"
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
                (n.href !== "/dashboard" && pathname.startsWith(n.href))
            )?.label ?? "Dashboard"}
          </h1>
        </header>

        <div className="flex-1 overflow-y-auto">{children}</div>
      </main>
    </div>
  );
}
