"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Loader2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  X,
  Check,
  Play,
  Square,
  Terminal,
  Zap,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { getRecuperacaoPendente, resolverRecuperacaoPendente } from "../../../../lib/api";
import type { RecuperacaoPendenteItem } from "../../../../lib/api";

const CONECTOR_URL = "http://localhost:3334";
const TAMANHO_PAGINA = 50;

// ─── Tipos locais ─────────────────────────────────────────────────────────────
type StatusLinha =
  | { tipo: "pendente" }
  | { tipo: "consultando" }
  | { tipo: "encontrado"; serial: string; matExecutor?: string }
  | { tipo: "vazio"; msg: string }
  | { tipo: "erro"; msg: string }
  | { tipo: "conflito"; serial: string; msg: string }
  | { tipo: "gravado"; serial: string };

interface LogEntry {
  id: number;
  hora: string;
  tipo: "debug" | "info" | "sucesso" | "erro" | "aviso";
  msg: string;
}

type Etapa = "idle" | "aguardando_captcha" | "rodando" | "finalizado";

let logCounter = 0;

// ─── Página ───────────────────────────────────────────────────────────────────
export default function AutomacaoGdisPage() {
  const [itens, setItens] = useState<RecuperacaoPendenteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [pagina, setPagina] = useState(1);
  const [status, setStatus] = useState<Record<string, StatusLinha>>({});
  const [seriaisEditados, setSeriaisEditados] = useState<Record<string, string>>({});

  const [conectorOk, setConectorOk] = useState(false);
  const [etapa, setEtapa] = useState<Etapa>("idle");
  const [modoAutomatico, setModoAutomatico] = useState(false);
  const [cnpj, setCnpj] = useState("");
  const [inscEstadual, setInscEstadual] = useState("");

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logAberto, setLogAberto] = useState(true);
  const logBoxRef = useRef<HTMLDivElement>(null);

  // Guarda todo item já carregado. As linhas gravadas saem da lista no reload
  // seguinte, e sem isso o relatório perderia exatamente os sucessos.
  const cadastroRef = useRef(new Map<string, RecuperacaoPendenteItem>());

  // O handler do SSE é criado uma vez; o ref mantém o valor atual do toggle
  // acessível lá dentro sem recriar a conexão a cada troca.
  const modoAutomaticoRef = useRef(modoAutomatico);
  useEffect(() => {
    modoAutomaticoRef.current = modoAutomatico;
  }, [modoAutomatico]);

  const addLog = useCallback((tipo: LogEntry["tipo"], msg: string) => {
    const hora = new Date().toLocaleTimeString("pt-BR");
    setLogs((prev) => [...prev.slice(-400), { id: ++logCounter, hora, tipo, msg }]);
  }, []);

  // ── Carrega candidatos: só medidor de verdade e com serviço conhecido ──────
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const todos = await getRecuperacaoPendente();
      const candidatos = todos.filter(
        (i) => i.servicoGdis && i.tipoEquipamento.toUpperCase().startsWith("MEDID")
      );
      candidatos.forEach((i) => cadastroRef.current.set(i.medidorId, i));
      setItens(candidatos);
      setPagina(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ── Ping do conector ───────────────────────────────────────────────────────
  useEffect(() => {
    const checar = async () => {
      try {
        const r = await fetch(`${CONECTOR_URL}/ping`, { signal: AbortSignal.timeout(2000) });
        const j = await r.json();
        setConectorOk(!!j.ok);
      } catch {
        setConectorOk(false);
      }
    };
    checar();
    const t = setInterval(checar, 5000);
    return () => clearInterval(t);
  }, []);

  // Rola só a caixa do log. scrollIntoView arrastaria a página inteira junto.
  useEffect(() => {
    const box = logBoxRef.current;
    if (logAberto && box) box.scrollTop = box.scrollHeight;
  }, [logs, logAberto]);

  const gravarSerial = useCallback(
    async (medidorId: string, serial: string) => {
      try {
        await resolverRecuperacaoPendente(medidorId, serial);
        setStatus((prev) => ({ ...prev, [medidorId]: { tipo: "gravado", serial } }));
        addLog("sucesso", `Serial ${serial} gravado no medidor.`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "erro";
        if (msg.includes("CONFLITO_SERIAL")) {
          setStatus((prev) => ({ ...prev, [medidorId]: { tipo: "conflito", serial, msg } }));
          addLog("aviso", `Conflito: serial ${serial} já pertence a outro medidor. Linha ficou pendente de revisão manual.`);
        } else {
          addLog("erro", `Falha ao gravar ${serial}: ${msg}`);
        }
      }
    },
    [addLog]
  );

  // ── SSE do conector ────────────────────────────────────────────────────────
  useEffect(() => {
    if (etapa !== "rodando") return;
    const es = new EventSource(`${CONECTOR_URL}/status-stream`);

    es.onmessage = (e) => {
      const ev = JSON.parse(e.data);

      switch (ev.tipo) {
        case "debug":
          addLog("debug", ev.msg);
          break;
        case "inicio_lote":
          addLog("info", `Iniciando consulta de ${ev.total} serviço(s).`);
          break;
        case "iniciando":
          setStatus((prev) => ({ ...prev, [ev.medidorId]: { tipo: "consultando" } }));
          break;
        case "encontrado":
          setStatus((prev) => ({
            ...prev,
            [ev.medidorId]: { tipo: "encontrado", serial: ev.serial, matExecutor: ev.matExecutor },
          }));
          setSeriaisEditados((prev) => ({ ...prev, [ev.medidorId]: ev.serial }));
          addLog("sucesso", `Serviço ${ev.servicoGdis} → ${ev.serial}`);
          if (modoAutomaticoRef.current) gravarSerial(ev.medidorId, ev.serial);
          break;
        case "vazio":
          setStatus((prev) => ({ ...prev, [ev.medidorId]: { tipo: "vazio", msg: ev.msg } }));
          addLog("aviso", `Serviço ${ev.servicoGdis}: ${ev.msg}`);
          break;
        case "erro":
          setStatus((prev) => ({ ...prev, [ev.medidorId]: { tipo: "erro", msg: ev.msg } }));
          addLog("erro", `Serviço ${ev.servicoGdis}: ${ev.msg}`);
          break;
        case "sessao_perdida":
          addLog("erro", ev.msg);
          setEtapa("idle");
          break;
        case "cancelado":
          addLog("aviso", ev.msg);
          setEtapa("finalizado");
          break;
        case "fim_lote":
          addLog("info", "Lote finalizado.");
          setEtapa("finalizado");
          es.close();
          break;
      }
    };

    es.onerror = () => addLog("aviso", "Conexão de log interrompida.");

    return () => es.close();
  }, [etapa, addLog, gravarSerial]);

  // ── Ações ──────────────────────────────────────────────────────────────────
  const iniciarSessao = async () => {
    setLogs([]);
    addLog("info", "Abrindo navegador no login do GDIS…");
    try {
      const r = await fetch(`${CONECTOR_URL}/iniciar-sessao`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cnpj, inscEstadual }),
      });
      const j = await r.json();
      if (j.ok) {
        setEtapa("aguardando_captcha");
        addLog("info", "Navegador aberto. Resolva a senha e o reCAPTCHA.");
      } else {
        addLog("erro", j.erro);
      }
    } catch {
      addLog("erro", "Conector não respondeu. Rode: cd conector && node conector.js");
    }
  };

  const continuarAposCaptcha = async () => {
    addLog("info", "Verificando sessão…");
    try {
      const r = await fetch(`${CONECTOR_URL}/continuar-apos-captcha`, { method: "POST" });
      const j = await r.json();
      if (!j.ok) {
        addLog("erro", j.erro);
        return;
      }
      addLog("sucesso", "Sessão confirmada.");
      setEtapa("rodando");

      const lista = selecionados.map((medidorId) => {
        const item = itens.find((i) => i.medidorId === medidorId)!;
        return { medidorId, servicoGdis: item.servicoGdis };
      });
      setStatus(Object.fromEntries(selecionados.map((id) => [id, { tipo: "pendente" as const }])));

      await fetch(`${CONECTOR_URL}/buscar-seriais`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itens: lista }),
      });
    } catch (err) {
      addLog("erro", err instanceof Error ? err.message : "Erro ao continuar.");
    }
  };

  const cancelar = async () => {
    await fetch(`${CONECTOR_URL}/cancelar`, { method: "POST" }).catch(() => {});
    addLog("aviso", "Cancelamento solicitado.");
  };

  const toggleSelecionado = (id: string) =>
    setSelecionados((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const totalPaginas = Math.max(1, Math.ceil(itens.length / TAMANHO_PAGINA));
  const itensPagina = itens.slice((pagina - 1) * TAMANHO_PAGINA, pagina * TAMANHO_PAGINA);
  const paginaToda = itensPagina.every((i) => selecionados.includes(i.medidorId));

  // Pega os primeiros N que ainda não foram tentados nesta sessão, pra
  // rodadas de teste sucessivas irem avançando na lista em vez de repetir.
  const selecionarPrimeiros = (n: number) => {
    // "pendente" é linha de lote cancelado que nunca chegou a ser consultada.
    const naoProcessados = itens.filter((i) => {
      const st = status[i.medidorId];
      return !st || st.tipo === "pendente";
    });
    setSelecionados(naoProcessados.slice(0, n).map((i) => i.medidorId));
    setPagina(1);
  };

  const togglePagina = () => {
    const idsPagina = itensPagina.map((i) => i.medidorId);
    setSelecionados((prev) =>
      paginaToda
        ? prev.filter((id) => !idsPagina.includes(id))
        : [...new Set([...prev, ...idsPagina])]
    );
  };

  const toggleTodos = () => {
    const todosIds = itens.map((i) => i.medidorId);
    setSelecionados(todosIds.every((id) => selecionados.includes(id)) ? [] : todosIds);
  };

  // ── Relatório do lote ──────────────────────────────────────────────────────
  const baixarRelatorio = () => {
    const rotulo: Record<StatusLinha["tipo"], string> = {
      pendente: "Não consultado",
      consultando: "Interrompido durante consulta",
      encontrado: "Encontrado (não gravado)",
      vazio: "Sem serial no GDIS",
      erro: "Erro na consulta",
      conflito: "Conflito — serial já existe em outro medidor",
      gravado: "Gravado",
    };

    // Percorre o status (ordem de processamento), não a lista visível.
    const linhas = Object.entries(status).map(([medidorId, st]) => {
      const i = cadastroRef.current.get(medidorId);
      const serialResultado =
        st.tipo === "gravado" || st.tipo === "encontrado" || st.tipo === "conflito" ? st.serial : "";
      const obs = st.tipo === "erro" || st.tipo === "vazio" || st.tipo === "conflito" ? st.msg : "";
      return [
        i?.servicoGdis ?? "",
        i?.matricula ?? "",
        i?.colaborador ?? "",
        i?.tipoEquipamento ?? "",
        i?.serialAtual ?? "",
        serialResultado,
        rotulo[st.tipo],
        obs,
      ];
    });

    const cabecalho = [
      "Serviço GDIS",
      "Matrícula",
      "Colaborador",
      "Equipamento",
      "Serial anterior",
      "Serial encontrado",
      "Resultado",
      "Observação",
    ];

    const escapar = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const csv =
      "﻿" + [cabecalho, ...linhas].map((l) => l.map(escapar).join(";")).join("\r\n");

    const agora = new Date();
    const carimbo = `${agora.toISOString().slice(0, 10)}_${String(agora.getHours()).padStart(2, "0")}${String(
      agora.getMinutes()
    ).padStart(2, "0")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-automacao-gdis_${carimbo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const rodando = etapa === "rodando";
  const qtdEncontrados = Object.values(status).filter((s) => s.tipo === "encontrado").length;
  const qtdGravados = Object.values(status).filter((s) => s.tipo === "gravado").length;
  const qtdFalhas = Object.values(status).filter((s) => s.tipo === "erro" || s.tipo === "vazio").length;
  const qtdConflitos = Object.values(status).filter((s) => s.tipo === "conflito").length;
  const qtdProcessados = Object.keys(status).length;

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center gap-4 flex-shrink-0">
        <div className="flex-1">
          <h2 className="text-sm font-bold text-slate-900">Automação GDIS</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Consulta o serial instalado de cada serviço direto no GDIS. Só medidores — TCs ficam de fora.
          </p>
        </div>
        {itens.length > 0 && (
          <div className="text-right">
            <p className="text-xs text-slate-500">Disponíveis</p>
            <p className="text-lg font-black text-slate-900 leading-tight">{itens.length}</p>
          </div>
        )}
        <button
          type="button"
          onClick={baixarRelatorio}
          disabled={qtdProcessados === 0}
          title={
            qtdProcessados === 0
              ? "Nenhuma linha processada ainda"
              : `Baixar relatório de ${qtdProcessados} linha(s)`
          }
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Download size={13} />
          Relatório
          {qtdProcessados > 0 && <span className="opacity-75">({qtdProcessados})</span>}
        </button>
        <button
          type="button"
          onClick={load}
          disabled={loading || rodando}
          title="Recarregar"
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-40"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* ── Banner do conector + controles ── */}
        <div
          className={`bg-white border rounded-xl p-4 flex flex-col gap-3 shrink-0 ${
            conectorOk ? "border-l-4 border-l-emerald-500 border-slate-200" : "border-l-4 border-l-amber-500 border-slate-200"
          }`}
        >
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`w-2 h-2 rounded-full ${conectorOk ? "bg-emerald-500" : "bg-amber-500"}`} />
            <span className={`text-xs font-bold ${conectorOk ? "text-emerald-700" : "text-amber-700"}`}>
              {conectorOk ? "Conector ativo" : "Conector offline"}
            </span>
            {!conectorOk && (
              <span className="text-[11px] text-slate-500">
                Rode no terminal: <code className="bg-slate-100 px-1.5 py-0.5 rounded">cd conector &amp;&amp; node conector.js</code>
              </span>
            )}

            <label className="ml-auto flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={modoAutomatico}
                onChange={(e) => setModoAutomatico(e.target.checked)}
                className="w-4 h-4 accent-blue-600"
              />
              <Zap size={13} className={modoAutomatico ? "text-blue-600" : "text-slate-400"} />
              Modo automático (grava sem confirmar)
            </label>
          </div>

          {etapa === "idle" && (
            <div className="flex items-end gap-3 flex-wrap">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">CNPJ</label>
                <input
                  type="text"
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  placeholder="00.000.000/0000-00"
                  className="w-48 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                  Inscrição Estadual
                </label>
                <input
                  type="text"
                  value={inscEstadual}
                  onChange={(e) => setInscEstadual(e.target.value)}
                  placeholder="0000000000000"
                  className="w-48 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <button
                type="button"
                onClick={iniciarSessao}
                disabled={!conectorOk || selecionados.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] text-white text-xs font-bold rounded-lg hover:bg-[#2d5282] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              >
                <Play size={13} />
                Iniciar consulta ({selecionados.length})
              </button>
            </div>
          )}

          {etapa === "aguardando_captcha" && (
            <div className="flex items-center gap-3 p-3 bg-violet-50 border border-violet-200 rounded-lg">
              <Clock size={16} className="text-violet-500 shrink-0" />
              <p className="text-xs text-violet-800 flex-1">
                O navegador abriu. Preencha a <strong>senha</strong>, resolva o <strong>reCAPTCHA</strong> e entre no GDIS.
                Depois volte aqui e continue.
              </p>
              <button
                type="button"
                onClick={continuarAposCaptcha}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700 transition-colors whitespace-nowrap"
              >
                <Check size={13} />
                Resolvi — continuar
              </button>
            </div>
          )}

          {rodando && (
            <div className="flex items-center gap-3">
              <Loader2 size={14} className="animate-spin text-blue-600" />
              <span className="text-xs text-slate-600 flex-1">
                Consultando… {qtdEncontrados} encontrado(s), {qtdGravados} gravado(s), {qtdConflitos} conflito(s), {qtdFalhas} sem resultado.
              </span>
              <button
                type="button"
                onClick={cancelar}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors"
              >
                <Square size={12} />
                Cancelar
              </button>
            </div>
          )}

          {etapa === "finalizado" && (
            <div className="flex items-center gap-3">
              <CheckCircle2 size={14} className="text-emerald-600" />
              <span className="text-xs text-slate-600 flex-1">
                Finalizado: {qtdEncontrados} encontrado(s), {qtdGravados} gravado(s), {qtdConflitos} conflito(s),{" "}
                {qtdFalhas} sem resultado.
              </span>
              <button
                type="button"
                onClick={() => {
                  setEtapa("idle");
                  setSelecionados([]);
                  load();
                }}
                className="px-3 py-1.5 bg-slate-700 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors"
              >
                Nova consulta
              </button>
            </div>
          )}
        </div>

        {/* ── Log ── */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shrink-0">
          <button
            type="button"
            onClick={() => setLogAberto((v) => !v)}
            className="w-full flex items-center gap-2 px-4 py-2 border-b border-slate-800 text-left"
          >
            <Terminal size={13} className="text-slate-500" />
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Log de execução</span>
            <span className="ml-auto text-[11px] text-slate-600">{logs.length} linhas</span>
          </button>
          {logAberto && (
            <div ref={logBoxRef} className="max-h-64 overflow-y-auto py-2 font-mono text-[11px]">
              {logs.length === 0 ? (
                <p className="px-4 py-3 text-slate-600">Nenhum log ainda.</p>
              ) : (
                logs.map((l) => (
                  <div key={l.id} className="flex gap-2 px-4 py-0.5">
                    <span className="text-slate-600 shrink-0">{l.hora}</span>
                    <span
                      className={
                        l.tipo === "erro"
                          ? "text-red-400"
                          : l.tipo === "sucesso"
                          ? "text-emerald-400"
                          : l.tipo === "aviso"
                          ? "text-amber-400"
                          : l.tipo === "info"
                          ? "text-blue-400"
                          : "text-slate-500"
                      }
                    >
                      {l.msg}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* ── Erro / loading / lista ── */}
        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 shrink-0">
            <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold">Erro ao carregar</p>
              <p className="text-xs text-red-600 mt-0.5">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
              <X size={14} />
            </button>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center gap-3 py-12 text-slate-500">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Carregando…</span>
          </div>
        )}

        {!loading && !error && itens.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-slate-400">
            <CheckCircle2 size={32} className="text-emerald-400" />
            <p className="text-sm font-bold text-slate-600">Nenhum medidor pendente com serviço conhecido!</p>
          </div>
        )}

        {!loading && itens.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shrink-0">
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-3 flex-wrap">
              <span className="text-xs text-slate-600">
                <strong className="text-slate-900">{selecionados.length}</strong> selecionado(s) de {itens.length}
              </span>

              <div className="ml-auto flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Selecionar</span>
                {[10, 100, 1000].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => selecionarPrimeiros(n)}
                    disabled={rodando}
                    title={`Primeiros ${n} ainda não processados`}
                    className="px-2.5 py-1 bg-white border border-slate-300 text-xs font-bold text-slate-700 rounded-lg hover:bg-slate-100 hover:border-slate-400 transition-colors disabled:opacity-40"
                  >
                    {n}
                  </button>
                ))}
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={togglePagina}
                  disabled={rodando}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 disabled:opacity-40"
                >
                  {paginaToda ? "Desmarcar página" : "Esta página"}
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={toggleTodos}
                  disabled={rodando}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 disabled:opacity-40"
                >
                  {itens.every((i) => selecionados.includes(i.medidorId)) ? "Desmarcar todos" : `Todos (${itens.length})`}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-white border-b border-slate-100">
                    <th className="w-10 px-3 py-2"></th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Serviço</th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Matrícula</th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Colaborador</th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Equipamento</th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Serial encontrado</th>
                  </tr>
                </thead>
                <tbody>
                  {itensPagina.map((item) => {
                    const st = status[item.medidorId];
                    const sel = selecionados.includes(item.medidorId);
                    const serialEditado = seriaisEditados[item.medidorId] ?? "";

                    return (
                      <tr
                        key={item.medidorId}
                        className={`border-b border-slate-50 last:border-0 transition-colors ${
                          sel ? "bg-blue-50/40" : "hover:bg-slate-50"
                        }`}
                      >
                        <td className="px-3 py-2.5">
                          <input
                            type="checkbox"
                            checked={sel}
                            disabled={rodando}
                            onChange={() => toggleSelecionado(item.medidorId)}
                            className="w-4 h-4 accent-blue-600"
                          />
                        </td>
                        <td className="px-4 py-2.5 font-mono text-sm font-bold text-slate-800 whitespace-nowrap">
                          {item.servicoGdis}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-slate-600 font-mono whitespace-nowrap">{item.matricula}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-600 max-w-[150px] truncate">{item.colaborador}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-500 max-w-[170px] truncate" title={item.tipoEquipamento}>
                          {item.tipoEquipamento}
                        </td>
                        <td className="px-4 py-2.5">
                          {st?.tipo === "gravado" ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-lg">
                              <CheckCircle2 size={12} />
                              {st.serial}
                            </span>
                          ) : st?.tipo === "consultando" ? (
                            <span className="inline-flex items-center gap-1.5 text-xs text-blue-600 font-semibold">
                              <Loader2 size={12} className="animate-spin" />
                              Consultando…
                            </span>
                          ) : st?.tipo === "conflito" ? (
                            <span
                              className="inline-flex items-center gap-1.5 px-2 py-1 bg-red-50 border border-red-200 text-red-700 text-[11px] font-bold rounded-lg"
                              title={st.msg}
                            >
                              <AlertTriangle size={12} />
                              Conflito: {st.serial} já existe
                            </span>
                          ) : st?.tipo === "erro" || st?.tipo === "vazio" ? (
                            <span className="text-[11px] text-amber-700" title={st.msg}>
                              {st.tipo === "vazio" ? "Sem serial no GDIS" : "Erro"}
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={serialEditado}
                                onChange={(e) =>
                                  setSeriaisEditados((prev) => ({ ...prev, [item.medidorId]: e.target.value }))
                                }
                                placeholder="—"
                                className="w-36 px-2 py-1 border border-slate-300 rounded-lg text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400"
                              />
                              <button
                                type="button"
                                onClick={() => gravarSerial(item.medidorId, serialEditado.trim())}
                                disabled={!serialEditado.trim()}
                                title="Gravar este serial"
                                className="flex items-center gap-1 px-2.5 py-1 bg-[#1e3a5f] text-white text-xs font-bold rounded-lg hover:bg-[#2d5282] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                <Check size={12} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center gap-3">
              <span className="text-xs text-slate-500">
                {(pagina - 1) * TAMANHO_PAGINA + 1}–{Math.min(pagina * TAMANHO_PAGINA, itens.length)} de {itens.length}
              </span>
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPagina(1)}
                  disabled={pagina === 1}
                  className="px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-30"
                >
                  «
                </button>
                <button
                  type="button"
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  disabled={pagina === 1}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-30"
                >
                  <ChevronLeft size={13} />
                  Anterior
                </button>
                <span className="text-xs text-slate-600 font-semibold tabular-nums">
                  {pagina} / {totalPaginas}
                </span>
                <button
                  type="button"
                  onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                  disabled={pagina >= totalPaginas}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-30"
                >
                  Próxima
                  <ChevronRight size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setPagina(totalPaginas)}
                  disabled={pagina >= totalPaginas}
                  className="px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-30"
                >
                  »
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
