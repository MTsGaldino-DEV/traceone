"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ArrowDownToLine,
  AlertTriangle,
  Server,
  Frown,
  Clock,
  UserCheck,
  TrendingUp,
  MoreHorizontal,
  RefreshCw,
  ArrowUpFromLine,
  Package,
} from "lucide-react";
import { getDashboardStats } from "../../../lib/api";
import type { DashboardStats, StockMovement } from "../../../lib/supabase";

const movementTypeLabels: Record<string, string> = {
  DELIVERY: "Entrega",
  RETURN: "Devolução",
  LOSS: "Perda",
  REPLACEMENT: "Substituição",
  WRITEOFF: "Baixa",
};

const movementTypeColors: Record<string, string> = {
  DELIVERY: "bg-blue-100 text-blue-700",
  RETURN: "bg-emerald-100 text-emerald-700",
  LOSS: "bg-red-100 text-red-700",
  REPLACEMENT: "bg-violet-100 text-violet-700",
  WRITEOFF: "bg-gray-100 text-gray-600",
};

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Agora";
  if (mins < 60) return `${mins}min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    setError(null);
    try {
      const data = await getDashboardStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar dados.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const kpiCards = stats
    ? [
        {
          label: "Entregas do mês",
          value: stats.deliveriesMonth,
          description: "Movimentações de entrega",
          icon: ArrowDownToLine,
          iconColor: "text-blue-600",
          iconBg: "bg-blue-50",
          trend: `${stats.returnsMonth} devoluções no mesmo período`,
        },
        {
          label: "Estoque crítico",
          value: stats.lowStockCount,
          description: "Itens abaixo do mínimo",
          icon: AlertTriangle,
          iconColor: "text-amber-500",
          iconBg: "bg-amber-50",
          trend:
            stats.lowStockCount === 0
              ? "Nenhum alerta"
              : `${stats.lowStockCount} item(s) precisam reposição`,
        },
        {
          label: "Patrimônio alocado",
          value: stats.allocatedAssets,
          description: "Ativos com colaborador",
          icon: Server,
          iconColor: "text-violet-600",
          iconBg: "bg-violet-50",
          trend: `${stats.allocatedAssets} ativo(s) em uso`,
        },
        {
          label: "Perdas registradas",
          value: stats.lossesMonth,
          description: "Perdas no período",
          icon: Frown,
          iconColor: "text-red-500",
          iconBg: "bg-red-50",
          trend:
            stats.lossesMonth === 0
              ? "Nenhuma ocorrência"
              : `${stats.lossesMonth} ocorrência(s)`,
        },
        {
          label: "Itens vencendo",
          value: stats.expiringCount,
          description: "Próximos 30 dias",
          icon: Clock,
          iconColor: "text-orange-500",
          iconBg: "bg-orange-50",
          trend:
            stats.expiringCount === 0
              ? "Nenhum vencimento próximo"
              : `${stats.expiringCount} item(s) vencendo`,
        },
        {
          label: "Colaboradores ativos",
          value: stats.activeEmployees,
          description: `Total: ${stats.totalEmployees} cadastrados`,
          icon: UserCheck,
          iconColor: "text-emerald-600",
          iconBg: "bg-emerald-50",
          trend: `${stats.totalItems} itens no sistema`,
          trendUp: true,
        },
      ]
    : [];

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#0f172a]">Visão geral</h2>
          <p className="text-sm text-[#64748b] mt-0.5">
            {new Date().toLocaleDateString("pt-BR", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <button
          onClick={() => fetchStats(true)}
          disabled={refreshing || loading}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[#4b5563] bg-white border border-[#e5e7eb] rounded-lg hover:bg-[#f9fafb] transition-colors disabled:opacity-50"
        >
          <RefreshCw
            size={14}
            className={refreshing ? "animate-spin text-blue-500" : ""}
          />
          Atualizar
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-[#e5e7eb] p-5 animate-pulse"
              >
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg" />
                </div>
                <div className="mt-4 space-y-2">
                  <div className="h-3 bg-gray-100 rounded w-24" />
                  <div className="h-8 bg-gray-200 rounded w-16" />
                  <div className="h-3 bg-gray-100 rounded w-32" />
                </div>
              </div>
            ))
          : kpiCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className="bg-white rounded-xl border border-[#e5e7eb] p-5 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className={`p-2.5 rounded-lg ${card.iconBg}`}>
                      <Icon size={18} className={card.iconColor} />
                    </div>
                    <button className="p-1 text-[#d1d5db] hover:text-[#9ca3af] transition-colors">
                      <MoreHorizontal size={16} />
                    </button>
                  </div>

                  <div className="mt-4">
                    <p className="text-[#64748b] text-xs font-medium uppercase tracking-wide">
                      {card.label}
                    </p>
                    <p className="text-3xl font-bold text-[#0f172a] mt-1 tabular-nums">
                      {card.value}
                    </p>
                    <p className="text-xs text-[#94a3b8] mt-1">
                      {card.description}
                    </p>
                  </div>

                  {card.trend && (
                    <div className="mt-4 pt-3 border-t border-[#f1f5f9] flex items-center gap-1.5">
                      {card.trendUp && (
                        <TrendingUp size={12} className="text-emerald-500" />
                      )}
                      <span className="text-xs text-[#94a3b8]">
                        {card.trend}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent activity */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#e5e7eb] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#0f172a]">
              Atividade recente
            </h3>
            <span className="text-xs text-[#94a3b8] bg-[#f8f9fa] px-2 py-0.5 rounded-full">
              {stats?.recentMovements?.length ?? 0} registros
            </span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 animate-pulse">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-200 mt-2 flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-gray-100 rounded w-3/4" />
                    <div className="h-2.5 bg-gray-100 rounded w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : stats?.recentMovements?.length ? (
            <div className="space-y-3">
              {stats.recentMovements.map((mov: StockMovement) => (
                <div key={mov.id} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-300 mt-2 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                          movementTypeColors[mov.type] ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {movementTypeLabels[mov.type] ?? mov.type}
                      </span>
                      <p className="text-sm text-[#64748b] truncate">
                        <span className="font-medium text-[#0f172a]">
                          {mov.item_name}
                        </span>
                        {mov.employee_name && ` → ${mov.employee_name}`}
                      </p>
                    </div>
                    <p className="text-xs text-[#94a3b8] mt-0.5">
                      {formatRelativeTime(mov.created_at)}
                      {mov.user_name && ` · por ${mov.user_name}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-[#f1f5f9] flex items-center justify-center mb-3">
                <ArrowDownToLine size={20} className="text-[#cbd5e1]" />
              </div>
              <p className="text-sm font-medium text-[#94a3b8]">
                Nenhuma movimentação ainda
              </p>
              <p className="text-xs text-[#cbd5e1] mt-1">
                As movimentações de estoque aparecerão aqui
              </p>
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-xl border border-[#e5e7eb] p-5">
          <h3 className="text-sm font-semibold text-[#0f172a] mb-4">
            Ações rápidas
          </h3>
          <div className="space-y-2">
            {[
              {
                label: "Nova entrega",
                href: "/movimentacoes/nova",
                color: "text-blue-600 bg-blue-50 hover:bg-blue-100",
                icon: ArrowDownToLine,
              },
              {
                label: "Nova devolução",
                href: "/movimentacoes/nova?tipo=RETURN",
                color: "text-emerald-600 bg-emerald-50 hover:bg-emerald-100",
                icon: ArrowUpFromLine,
              },
              {
                label: "Cadastrar item",
                href: "/itens/novo",
                color: "text-violet-600 bg-violet-50 hover:bg-violet-100",
                icon: Package,
              },
              {
                label: "Adicionar colaborador",
                href: "/colaboradores/novo",
                color: "text-orange-600 bg-orange-50 hover:bg-orange-100",
                icon: UserCheck,
              },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <a
                  key={action.label}
                  href={action.href}
                  className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${action.color}`}
                >
                  <span className="flex items-center gap-2">
                    <Icon size={14} />
                    {action.label}
                  </span>
                  <ChevronRightIcon />
                </a>
              );
            })}
          </div>
        </div>
      </div>

      {/* System status banner */}
      <div className="bg-white border border-[#e5e7eb] rounded-xl px-5 py-4 flex items-center gap-4">
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">
            Sistema online
          </span>
        </div>
        <div className="w-px h-4 bg-[#e5e7eb]" />
        <p className="text-xs text-[#94a3b8]">
          TraceOne está operacional · Banco de dados:{" "}
          <span className="font-medium text-[#64748b]">Supabase</span>
        </p>
      </div>
    </div>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}
