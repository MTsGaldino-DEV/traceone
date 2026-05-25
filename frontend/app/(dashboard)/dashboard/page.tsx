"use client";

import { useState } from "react";
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
} from "lucide-react";

interface KpiCard {
  label: string;
  value: string | number;
  description: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  trend?: string;
  trendUp?: boolean;
}

const kpiCards: KpiCard[] = [
  {
    label: "Entregas do mês",
    value: 0,
    description: "Movimentações de entrega",
    icon: ArrowDownToLine,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-50",
    trend: "+0% vs mês anterior",
    trendUp: true,
  },
  {
    label: "Estoque crítico",
    value: 0,
    description: "Itens abaixo do mínimo",
    icon: AlertTriangle,
    iconColor: "text-amber-500",
    iconBg: "bg-amber-50",
    trend: "Nenhum alerta",
  },
  {
    label: "Patrimônio alocado",
    value: 0,
    description: "Ativos com colaborador",
    icon: Server,
    iconColor: "text-violet-600",
    iconBg: "bg-violet-50",
    trend: "0 itens",
  },
  {
    label: "Perdas registradas",
    value: 0,
    description: "Perdas no período",
    icon: Frown,
    iconColor: "text-red-500",
    iconBg: "bg-red-50",
    trend: "0 ocorrências",
  },
  {
    label: "Itens vencendo",
    value: 0,
    description: "Próximos 30 dias",
    icon: Clock,
    iconColor: "text-orange-500",
    iconBg: "bg-orange-50",
    trend: "Nenhum vencimento",
  },
  {
    label: "Colaboradores ativos",
    value: 0,
    description: "Total de colaboradores",
    icon: UserCheck,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50",
    trend: "0 cadastrados",
  },
];

const recentActivity = [
  {
    type: "info",
    message: "Nenhuma movimentação registrada ainda.",
    time: "Agora",
  },
];

export default function DashboardPage() {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#0f172a]">
            Visão geral
          </h2>
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
          onClick={handleRefresh}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[#4b5563] bg-white border border-[#e5e7eb] rounded-lg hover:bg-[#f9fafb] transition-colors"
        >
          <RefreshCw
            size={14}
            className={refreshing ? "animate-spin text-blue-500" : ""}
          />
          Atualizar
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {kpiCards.map((card) => {
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
                <p className="text-xs text-[#94a3b8] mt-1">{card.description}</p>
              </div>

              {card.trend && (
                <div className="mt-4 pt-3 border-t border-[#f1f5f9] flex items-center gap-1.5">
                  {card.trendUp && (
                    <TrendingUp size={12} className="text-emerald-500" />
                  )}
                  <span className="text-xs text-[#94a3b8]">{card.trend}</span>
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
              0 registros
            </span>
          </div>

          <div className="space-y-3">
            {recentActivity.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-[#d1d5db] mt-2 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#64748b]">{item.message}</p>
                  <p className="text-xs text-[#94a3b8] mt-0.5">{item.time}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Empty state illustration */}
          <div className="mt-8 flex flex-col items-center justify-center py-8 text-center">
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
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-xl border border-[#e5e7eb] p-5">
          <h3 className="text-sm font-semibold text-[#0f172a] mb-4">
            Ações rápidas
          </h3>
          <div className="space-y-2">
            {[
              { label: "Nova entrega", href: "/movimentacoes/nova", color: "text-blue-600 bg-blue-50 hover:bg-blue-100" },
              { label: "Cadastrar item", href: "/itens/novo", color: "text-violet-600 bg-violet-50 hover:bg-violet-100" },
              { label: "Adicionar colaborador", href: "/colaboradores/novo", color: "text-emerald-600 bg-emerald-50 hover:bg-emerald-100" },
              { label: "Ver relatório", href: "/relatorios", color: "text-orange-600 bg-orange-50 hover:bg-orange-100" },
            ].map((action) => (
              <a
                key={action.label}
                href={action.href}
                className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${action.color}`}
              >
                {action.label}
                <ChevronRightIcon />
              </a>
            ))}
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
          TraceOne está operacional · Backend:{" "}
          <span className="font-medium text-[#64748b]">
            traceone-backend.onrender.com
          </span>
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
