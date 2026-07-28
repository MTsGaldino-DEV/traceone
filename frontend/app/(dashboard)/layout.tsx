"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Package,
  ArrowLeftRight,
  Warehouse,
  FileText,
  Shield,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import type { Profile } from "../../lib/supabase";
import { logout } from "../../lib/api";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Colaboradores", href: "/colaboradores", icon: Users },
  { label: "Itens", href: "/itens", icon: Package },
  { label: "Movimentações", href: "/movimentacoes", icon: ArrowLeftRight },
  { label: "Estoque", href: "/estoque", icon: Warehouse },
  { label: "Relatórios", href: "/relatorios", icon: FileText },
  { label: "Auditoria", href: "/auditoria", icon: Shield },
];

const roleLabels: Record<string, string> = {
  ADMIN: "Administrador",
  ALMOXARIFE: "Almoxarife",
  GESTOR: "Gestor",
};

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

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const displayName = profile?.name ?? "Usuário";
  const displayRole = profile?.role ? (roleLabels[profile.role] ?? profile.role) : "Carregando...";

  return (
    <div className="flex h-screen bg-[#f8f9fa] overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="flex flex-col w-60 flex-shrink-0 bg-white border-r border-[#e5e7eb]">
        {/* Logo */}
        <div className="h-14 flex items-center px-5 border-b border-[#e5e7eb]">
          <span
            className="text-xl font-black text-[#0f172a] tracking-tight"
            style={{ letterSpacing: "-0.04em" }}
          >
            TraceOne
            <span className="text-blue-600">.</span>
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ label, href, icon: Icon }) => {
            const isActive =
              pathname === href ||
              (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-[#4b5563] hover:bg-[#f3f4f6] hover:text-[#0f172a]"
                }`}
              >
                <Icon
                  size={16}
                  className={`flex-shrink-0 transition-colors ${
                    isActive
                      ? "text-blue-600"
                      : "text-[#9ca3af] group-hover:text-[#4b5563]"
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
        <div className="border-t border-[#e5e7eb] p-3">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold uppercase">
                {displayName.charAt(0)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#0f172a] truncate">
                {displayName}
              </p>
              <p className="text-xs text-[#9ca3af]">{displayRole}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Sair"
              className="p-1.5 rounded-md text-[#9ca3af] hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-[#e5e7eb] flex items-center px-6 flex-shrink-0">
          <h1 className="text-sm font-semibold text-[#0f172a]">
            {navItems.find(
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
