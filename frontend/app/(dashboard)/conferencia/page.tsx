"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  ClipboardCopy,
  Link2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  X,
  ClipboardCheck,
  ChevronRight,
} from "lucide-react";
import { getServicosConferencia, vincularServicoMedidor } from "../../../lib/api";
import type { ServicoReportConferencia } from "../../../lib/supabase";

// ─── Toast simples ────────────────────────────────────────────────────────────
interface ToastMsg {
  id: number;
  type: "success" | "error";
  text: string;
}

let toastCounter = 0;

function useToasts() {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  const addToast = useCallback((type: ToastMsg["type"], text: string) => {
    const id = ++toastCounter;
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  return { toasts, addToast };
}

// ─── Componente de linha da tabela ────────────────────────────────────────────
interface RowProps {
  servico: ServicoReportConferencia;
  onVinculado: (servicoId: string) => void;
  addToast: (type: "success" | "error", text: string) => void;
  isNext: boolean; // próxima linha a ser processada
  copyBtnRef?: (el: HTMLButtonElement | null) => void;
}

function ConferenciaRow({ servico, onVinculado, addToast, isNext, copyBtnRef }: RowProps) {
  const [serial, setSerial] = useState("");
  const [vinculando, setVinculando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const serialInputRef = useRef<HTMLInputElement>(null);
  const copyBtnLocalRef = useRef<HTMLButtonElement>(null);

  // Expõe o botão copiar pra o componente pai mover foco até ele
  useEffect(() => {
    copyBtnRef?.(copyBtnLocalRef.current);
  });

  const handleCopiar = () => {
    navigator.clipboard.writeText(servico.servico).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      // Move foco pro campo de serial desta linha
      serialInputRef.current?.focus();
    });
  };

  const handleVincular = useCallback(async () => {
    const s = serial.trim();
    if (!s) return;
    setVinculando(true);
    setErro(null);
    try {
      const result = await vincularServicoMedidor(servico.servico, s);
      if (result.ok) {
        addToast("success", `✅ ${result.nome ?? result.serial} vinculado ao serviço ${servico.servico}`);
        onVinculado(servico.servico);
      } else {
        setErro(result.error ?? "Erro desconhecido.");
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao vincular.");
    } finally {
      setVinculando(false);
    }
  }, [serial, servico.servico, addToast, onVinculado]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleVincular();
    }
  };

  const terminoFormatado = (() => {
    try {
      return new Date(servico.termino).toLocaleDateString("pt-BR");
    } catch {
      return servico.termino;
    }
  })();

  return (
    <tr
      className={`border-b border-slate-100 transition-colors ${
        isNext ? "bg-blue-50/40" : "hover:bg-slate-50"
      }`}
    >
      {/* Nº Serviço */}
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center gap-2">
          {isNext && <ChevronRight size={14} className="text-blue-500 shrink-0" />}
          <span className="font-mono text-sm font-bold text-slate-800">{servico.servico}</span>
        </div>
        <span className="text-xs text-slate-400 font-mono">{terminoFormatado}</span>
      </td>

      {/* Matrícula */}
      <td className="px-4 py-3 text-xs text-slate-600 font-mono whitespace-nowrap">
        {servico.matricula ?? <span className="text-slate-300">—</span>}
      </td>

      {/* Tipo Serv */}
      <td className="px-4 py-3 text-xs text-slate-500 max-w-[140px] truncate">
        {servico.tipo_serv ?? <span className="text-slate-300">—</span>}
      </td>

      {/* Copiar */}
      <td className="px-3 py-3 whitespace-nowrap">
        <button
          ref={(el) => {
            copyBtnLocalRef.current = el as HTMLButtonElement;
            copyBtnRef?.(el);
          }}
          id={`copy-btn-${servico.servico}`}
          type="button"
          onClick={handleCopiar}
          title="Copiar Nº do Serviço"
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all border ${
            copied
              ? "bg-emerald-100 text-emerald-700 border-emerald-300"
              : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-blue-100 hover:text-blue-700 hover:border-blue-300"
          }`}
        >
          {copied ? (
            <><ClipboardCheck size={13} /> Copiado!</>
          ) : (
            <><ClipboardCopy size={13} /> Copiar</>
          )}
        </button>
      </td>

      {/* Campo serial + Vincular */}
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          <input
            ref={serialInputRef}
            id={`serial-input-${servico.servico}`}
            type="text"
            value={serial}
            onChange={(e) => { setSerial(e.target.value); setErro(null); }}
            onKeyDown={handleKeyDown}
            placeholder="Serial do medidor"
            className={`w-44 px-3 py-1.5 border rounded-lg text-xs font-mono font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
              erro
                ? "border-red-400 focus:ring-red-300 bg-red-50"
                : "border-slate-300 focus:ring-blue-400 focus:border-blue-400"
            }`}
          />
          <button
            id={`vincular-btn-${servico.servico}`}
            type="button"
            onClick={handleVincular}
            disabled={!serial.trim() || vinculando}
            title="Vincular (ou Enter)"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e3a5f] text-white text-xs font-bold rounded-lg hover:bg-[#2d5282] transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shadow-sm"
          >
            {vinculando ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Link2 size={13} />
            )}
            {vinculando ? "…" : "Vincular"}
          </button>
        </div>
        {/* Erro inline */}
        {erro && (
          <div className="flex items-start gap-1.5 mt-1.5">
            <AlertTriangle size={11} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-red-600 font-semibold leading-tight">{erro}</p>
          </div>
        )}
      </td>
    </tr>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function ConferenciaPage() {
  const [servicos, setServicos] = useState<ServicoReportConferencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [totalOriginal, setTotalOriginal] = useState(0);
  const { toasts, addToast } = useToasts();

  // Refs dos botões "Copiar" para mover o foco entre linhas
  const copyBtnRefs = useRef<Map<string, HTMLButtonElement | null>>(new Map());

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getServicosConferencia();
      setServicos(data);
      setTotalOriginal((prev) => (prev === 0 ? data.length : prev));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Erro ao carregar serviços.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleVinculado = useCallback(
    (servicoId: string) => {
      setServicos((prev) => {
        const idx = prev.findIndex((s) => s.servico === servicoId);
        const next = prev.filter((s) => s.servico !== servicoId);

        // Mover foco para o botão "Copiar" da próxima linha
        const nextServico = prev[idx + 1] ?? prev[idx - 1];
        if (nextServico) {
          setTimeout(() => {
            const btn = copyBtnRefs.current.get(nextServico.servico);
            btn?.focus();
          }, 50);
        }

        return next;
      });
    },
    []
  );

  const conferidos = totalOriginal - servicos.length;
  const total = totalOriginal;

  return (
    <div className="flex flex-col h-full">
      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm font-semibold pointer-events-auto transition-all ${
              t.type === "success"
                ? "bg-emerald-600 text-white"
                : "bg-red-600 text-white"
            }`}
          >
            {t.type === "success" ? (
              <CheckCircle2 size={16} />
            ) : (
              <AlertTriangle size={16} />
            )}
            {t.text}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center gap-4 flex-shrink-0">
        <div className="flex-1">
          <h2 className="text-sm font-bold text-slate-900">Conferência de Serviços</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Para cada serviço, abra no GDIS, anote o serial do medidor e informe abaixo.
          </p>
        </div>

        {/* Contador */}
        {total > 0 && (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-slate-500">Conferidos</p>
              <p className="text-lg font-black text-slate-900 leading-tight">
                {conferidos}
                <span className="text-slate-400 font-normal text-sm"> / {total}</span>
              </p>
            </div>
            {/* Barra de progresso */}
            <div className="w-24 h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: total > 0 ? `${(conferidos / total) * 100}%` : "0%" }}
              />
            </div>
          </div>
        )}

        {/* Reload */}
        <button
          onClick={load}
          disabled={loading}
          title="Recarregar"
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-40"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center gap-3 py-20 text-slate-500">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm">Carregando serviços pendentes…</span>
          </div>
        )}

        {loadError && (
          <div className="m-6 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800">
            <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold">Erro ao carregar</p>
              <p className="text-xs text-red-600 mt-0.5">{loadError}</p>
            </div>
            <button onClick={() => setLoadError(null)} className="text-red-400 hover:text-red-600">
              <X size={16} />
            </button>
          </div>
        )}

        {!loading && !loadError && servicos.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-slate-400">
            <CheckCircle2 size={40} className="text-emerald-400" />
            <p className="text-sm font-bold text-slate-600">Tudo conferido!</p>
            <p className="text-xs text-slate-400">Não há serviços pendentes de conferência.</p>
          </div>
        )}

        {!loading && servicos.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                    Nº Serviço / Data
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Matrícula
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Tipo Serv.
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Copiar
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Serial do Medidor
                  </th>
                </tr>
              </thead>
              <tbody>
                {servicos.map((s, idx) => (
                  <ConferenciaRow
                    key={s.servico}
                    servico={s}
                    onVinculado={handleVinculado}
                    addToast={addToast}
                    isNext={idx === 0}
                    copyBtnRef={(el) => copyBtnRefs.current.set(s.servico, el)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
