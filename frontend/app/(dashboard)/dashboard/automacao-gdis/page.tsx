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
  History,
} from "lucide-react";
import {
  getRecuperacaoPendente,
  resolverRecuperacaoPendente,
  getServicosConferenciaParaAutomacao,
  vincularServicoMedidor,
  registrarAutomacaoLog,
  getAutomacaoExecucoes,
  getAutomacaoExecucaoItens,
} from "../../../../lib/api";
import type {
  AutomacaoExecucao,
  ResultadoAutomacao,
  OrigemAutomacao,
} from "../../../../lib/api";

const CONECTOR_URL = "http://localhost:3334";
const TAMANHO_PAGINA = 50;

const COLUNAS_BASE = [
  "Fila",
  "Serviço GDIS",
  "Matrícula",
  "Colaborador",
  "Equipamento",
  "Serial anterior",
  "Serial encontrado",
  "Resultado",
  "Observação",
];

const ROTULO_FILA: Record<OrigemAutomacao, string> = {
  RECUPERACAO: "Recuperação",
  CONFERENCIA: "Conferência",
};

const ROTULO_RESULTADO: Record<ResultadoAutomacao, string> = {
  ENCONTRADO: "Encontrado (não gravado)",
  GRAVADO: "Gravado",
  CONFLITO: "Gravado (serial duplicado em outra linha)",
  VAZIO: "Sem serial no GDIS",
  ERRO: "Erro na consulta",
  AGUARDANDO: "Aguardando vínculo (serial não bate com nenhum medidor pendente)",
};

function baixarCsv(cabecalho: string[], linhas: string[][], nomeArquivo: string) {
  const escapar = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  // BOM pro Excel abrir os acentos certo; ";" é o separador que ele espera em pt-BR.
  const csv = "﻿" + [cabecalho, ...linhas].map((l) => l.map(escapar).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  a.click();
  URL.revokeObjectURL(url);
}

function carimboArquivo(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}

// ─── Tipos locais ─────────────────────────────────────────────────────────────

/**
 * Duas filas, um item comum. "chave" é a identidade da linha em todo o resto
 * da tela (seleção, status, log) — "rec:<medidorId>" ou "conf:<servico>". O
 * conector só ecoa de volta o que a gente manda no campo "medidorId" do
 * protocolo, então essa chave viaja nele sem precisar mudar o conector.
 */
type ItemAutomacao =
  | {
      origem: "RECUPERACAO";
      chave: string;
      medidorId: string;
      servicoGdis: string;
      matricula: string;
      colaborador: string;
      tipoEquipamento: string;
      serialAtual: string;
    }
  | {
      origem: "CONFERENCIA";
      chave: string;
      servicoGdis: string;
      matricula: string | null;
    };

type StatusLinha =
  | { tipo: "pendente" }
  | { tipo: "consultando" }
  | { tipo: "encontrado"; serial: string; matExecutor?: string }
  | { tipo: "vazio"; msg: string }
  | { tipo: "erro"; msg: string }
  | { tipo: "gravado"; serial: string; duplicado?: boolean }
  | { tipo: "aguardando"; serial: string };

interface LogEntry {
  id: number;
  hora: string;
  tipo: "debug" | "info" | "sucesso" | "erro" | "aviso";
  msg: string;
}

type Etapa = "idle" | "aguardando_captcha" | "rodando" | "finalizado";
type FiltroFila = "todas" | OrigemAutomacao;

let logCounter = 0;

// ─── Página ───────────────────────────────────────────────────────────────────
export default function AutomacaoGdisPage() {
  const [itens, setItens] = useState<ItemAutomacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [filtroFila, setFiltroFila] = useState<FiltroFila>("todas");
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
  const cadastroRef = useRef(new Map<string, ItemAutomacao>());

  // Identifica a rodada atual no banco. Criado no início do lote, ou sob
  // demanda quando alguém grava na mão sem ter disparado um lote.
  const execucaoIdRef = useRef<string | null>(null);

  const [execucoes, setExecucoes] = useState<AutomacaoExecucao[]>([]);
  const [baixandoId, setBaixandoId] = useState<string | null>(null);

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

  // ── Carrega candidatos das duas filas ──────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [recuperacao, conferencia] = await Promise.all([
        getRecuperacaoPendente(),
        getServicosConferenciaParaAutomacao(),
      ]);

      // Recuperação: só medidor de verdade e com serviço conhecido.
      const daRecuperacao: ItemAutomacao[] = recuperacao
        .filter((i) => i.servicoGdis && i.tipoEquipamento.toUpperCase().startsWith("MEDID"))
        .map((i) => ({
          origem: "RECUPERACAO",
          chave: `rec:${i.medidorId}`,
          medidorId: i.medidorId,
          servicoGdis: i.servicoGdis as string,
          matricula: i.matricula,
          colaborador: i.colaborador,
          tipoEquipamento: i.tipoEquipamento,
          serialAtual: i.serialAtual,
        }));

      // Conferência: serviço sem medidor vinculado ainda — não tem tipo de
      // equipamento nem colaborador pra mostrar, só o serviço e a matrícula.
      const daConferencia: ItemAutomacao[] = conferencia.map((s) => ({
        origem: "CONFERENCIA",
        chave: `conf:${s.servico}`,
        servicoGdis: s.servico,
        matricula: s.matricula,
      }));

      const candidatos = [...daRecuperacao, ...daConferencia];
      candidatos.forEach((i) => cadastroRef.current.set(i.chave, i));
      setItens(candidatos);
      setPagina(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, []);

  const carregarExecucoes = useCallback(async () => {
    try {
      setExecucoes(await getAutomacaoExecucoes());
    } catch {
      // Histórico é acessório: se falhar, a automação continua utilizável.
    }
  }, []);

  useEffect(() => {
    load();
    carregarExecucoes();
  }, [load, carregarExecucoes]);

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

  // Grava o desfecho da linha no banco. Falha aqui não derruba o lote — o
  // relatório da sessão continua valendo, só o histórico fica incompleto.
  const registrarLog = useCallback(
    async (
      chave: string,
      resultado: ResultadoAutomacao,
      extra: { serial?: string | null; obs?: string | null; modo?: "AUTOMATICO" | "MANUAL" } = {}
    ) => {
      const item = cadastroRef.current.get(chave);
      if (!item) return;
      if (!execucaoIdRef.current) execucaoIdRef.current = crypto.randomUUID();

      try {
        await registrarAutomacaoLog({
          execucaoId: execucaoIdRef.current,
          chaveItem: chave,
          origem: item.origem,
          medidorId: item.origem === "RECUPERACAO" ? item.medidorId : null,
          servicoGdis: item.servicoGdis,
          matricula: item.matricula,
          colaborador: item.origem === "RECUPERACAO" ? item.colaborador : null,
          tipoEquipamento: item.origem === "RECUPERACAO" ? item.tipoEquipamento : null,
          serialAnterior: item.origem === "RECUPERACAO" ? item.serialAtual : null,
          serialEncontrado: extra.serial ?? null,
          resultado,
          observacao: extra.obs ?? null,
          modo: extra.modo ?? "AUTOMATICO",
        });
      } catch (err) {
        addLog("aviso", `Log não salvo: ${err instanceof Error ? err.message : "erro"}`);
      }
    },
    [addLog]
  );

  const gravarSerial = useCallback(
    async (chave: string, serial: string, modo: "AUTOMATICO" | "MANUAL") => {
      const item = cadastroRef.current.get(chave);
      if (!item) return;

      try {
        if (item.origem === "RECUPERACAO") {
          const duplicado = await resolverRecuperacaoPendente(item.medidorId, serial);
          setStatus((prev) => ({ ...prev, [chave]: { tipo: "gravado", serial, duplicado } }));
          if (duplicado) {
            addLog(
              "aviso",
              `Serial ${serial} gravado, mas já existe em outra linha — marcado para revisão de duplicidade depois.`
            );
            registrarLog(chave, "CONFLITO", {
              serial,
              obs: "Gravado; serial já existia em outra linha da lista de medidores.",
              modo,
            });
          } else {
            addLog("sucesso", `Serial ${serial} gravado no medidor.`);
            registrarLog(chave, "GRAVADO", { serial, modo });
          }
        } else {
          // Conferência: o serial pode não bater com nenhum medidor PENDENTE
          // no cadastro — não é erro, o serviço só fica pra revisão manual.
          const resultado = await vincularServicoMedidor(item.servicoGdis, serial);
          if (resultado.aguardando) {
            setStatus((prev) => ({ ...prev, [chave]: { tipo: "aguardando", serial } }));
            addLog(
              "aviso",
              `Serial ${serial} não corresponde a nenhum medidor pendente no cadastro — serviço ${item.servicoGdis} segue aguardando na Conferência.`
            );
            registrarLog(chave, "AGUARDANDO", {
              serial,
              obs: "Nenhum medidor PENDENTE com esse serial no cadastro.",
              modo,
            });
          } else {
            setStatus((prev) => ({ ...prev, [chave]: { tipo: "gravado", serial } }));
            addLog(
              "sucesso",
              `Serial ${serial} vinculado ao serviço ${item.servicoGdis}${resultado.nome ? ` (${resultado.nome})` : ""}.`
            );
            registrarLog(chave, "GRAVADO", {
              serial,
              obs: resultado.nome ? `Vinculado a ${resultado.nome}.` : null,
              modo,
            });
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "erro";
        addLog("erro", `Falha ao gravar ${serial}: ${msg}`);
        registrarLog(chave, "ERRO", { serial, obs: msg, modo });
      }
    },
    [addLog, registrarLog]
  );

  // ── SSE do conector ────────────────────────────────────────────────────────
  useEffect(() => {
    if (etapa !== "rodando") return;
    const es = new EventSource(`${CONECTOR_URL}/status-stream`);

    es.onmessage = (e) => {
      const ev = JSON.parse(e.data);
      // O conector só ecoa esse campo de volta — aqui ele carrega a chave
      // combinada ("rec:..." / "conf:..."), não um medidor_id de verdade.
      const chave = ev.medidorId;

      switch (ev.tipo) {
        case "debug":
          addLog("debug", ev.msg);
          break;
        case "inicio_lote":
          addLog("info", `Iniciando consulta de ${ev.total} serviço(s).`);
          break;
        case "iniciando":
          setStatus((prev) => ({ ...prev, [chave]: { tipo: "consultando" } }));
          break;
        case "encontrado":
          setStatus((prev) => ({
            ...prev,
            [chave]: { tipo: "encontrado", serial: ev.serial, matExecutor: ev.matExecutor },
          }));
          setSeriaisEditados((prev) => ({ ...prev, [chave]: ev.serial }));
          addLog("sucesso", `Serviço ${ev.servicoGdis} → ${ev.serial}`);
          if (modoAutomaticoRef.current) {
            gravarSerial(chave, ev.serial, "AUTOMATICO");
          } else {
            registrarLog(chave, "ENCONTRADO", { serial: ev.serial });
          }
          break;
        case "vazio":
          setStatus((prev) => ({ ...prev, [chave]: { tipo: "vazio", msg: ev.msg } }));
          addLog("aviso", `Serviço ${ev.servicoGdis}: ${ev.msg}`);
          registrarLog(chave, "VAZIO", { obs: ev.msg });
          break;
        case "erro":
          setStatus((prev) => ({ ...prev, [chave]: { tipo: "erro", msg: ev.msg } }));
          addLog("erro", `Serviço ${ev.servicoGdis}: ${ev.msg}`);
          registrarLog(chave, "ERRO", { obs: ev.msg });
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
          carregarExecucoes();
          es.close();
          break;
      }
    };

    es.onerror = () => addLog("aviso", "Conexão de log interrompida.");

    return () => es.close();
  }, [etapa, addLog, gravarSerial, registrarLog, carregarExecucoes]);

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
      execucaoIdRef.current = crypto.randomUUID();
      setEtapa("rodando");

      // "medidorId" é só o nome do campo no protocolo do conector — carrega
      // a chave combinada, ele nunca olha pra dentro do valor.
      const lista = selecionados.map((chave) => {
        const item = cadastroRef.current.get(chave)!;
        return { medidorId: chave, servicoGdis: item.servicoGdis };
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

  const toggleSelecionado = (chave: string) =>
    setSelecionados((prev) => (prev.includes(chave) ? prev.filter((x) => x !== chave) : [...prev, chave]));

  // Lista combinada, filtrada pela fila escolhida acima da tabela.
  const itensVisiveis = filtroFila === "todas" ? itens : itens.filter((i) => i.origem === filtroFila);
  const qtdRecuperacao = itens.filter((i) => i.origem === "RECUPERACAO").length;
  const qtdConferencia = itens.filter((i) => i.origem === "CONFERENCIA").length;

  const totalPaginas = Math.max(1, Math.ceil(itensVisiveis.length / TAMANHO_PAGINA));
  const itensPagina = itensVisiveis.slice((pagina - 1) * TAMANHO_PAGINA, pagina * TAMANHO_PAGINA);
  const paginaToda = itensPagina.every((i) => selecionados.includes(i.chave));

  // Pega os primeiros N que ainda não foram tentados nesta sessão, pra
  // rodadas de teste sucessivas irem avançando na lista em vez de repetir.
  const selecionarPrimeiros = (n: number) => {
    // "pendente" é linha de lote cancelado que nunca chegou a ser consultada.
    const naoProcessados = itensVisiveis.filter((i) => {
      const st = status[i.chave];
      return !st || st.tipo === "pendente";
    });
    setSelecionados(naoProcessados.slice(0, n).map((i) => i.chave));
    setPagina(1);
  };

  const togglePagina = () => {
    const chavesPagina = itensPagina.map((i) => i.chave);
    setSelecionados((prev) =>
      paginaToda
        ? prev.filter((id) => !chavesPagina.includes(id))
        : [...new Set([...prev, ...chavesPagina])]
    );
  };

  const toggleTodos = () => {
    const todasChaves = itensVisiveis.map((i) => i.chave);
    setSelecionados(todasChaves.every((id) => selecionados.includes(id)) ? [] : todasChaves);
  };

  // ── Relatório do lote ──────────────────────────────────────────────────────
  const baixarRelatorio = () => {
    // Percorre o status (ordem de processamento), não a lista visível.
    const linhas = Object.entries(status).map(([chave, st]) => {
      const i = cadastroRef.current.get(chave);
      const serialResultado =
        st.tipo === "gravado" || st.tipo === "encontrado" || st.tipo === "aguardando" ? st.serial : "";
      const obs = st.tipo === "erro" || st.tipo === "vazio" ? st.msg : "";
      const rotuloLinha =
        st.tipo === "gravado" && st.duplicado
          ? "Gravado (serial duplicado em outra linha)"
          : st.tipo === "pendente"
          ? "Não consultado"
          : st.tipo === "consultando"
          ? "Interrompido durante consulta"
          : st.tipo === "encontrado"
          ? "Encontrado (não gravado)"
          : st.tipo === "aguardando"
          ? "Aguardando vínculo (serial não bate com pendente)"
          : st.tipo === "vazio"
          ? "Sem serial no GDIS"
          : st.tipo === "erro"
          ? "Erro na consulta"
          : "Gravado";
      return [
        i ? ROTULO_FILA[i.origem] : "",
        i?.servicoGdis ?? "",
        i?.matricula ?? "",
        i && i.origem === "RECUPERACAO" ? i.colaborador : "",
        i && i.origem === "RECUPERACAO" ? i.tipoEquipamento : "",
        i && i.origem === "RECUPERACAO" ? i.serialAtual : "",
        serialResultado,
        rotuloLinha,
        obs,
      ];
    });

    baixarCsv(COLUNAS_BASE, linhas, `relatorio-automacao-gdis_${carimboArquivo(new Date())}.csv`);
  };

  const baixarExecucao = async (execucaoId: string, inicio: string) => {
    setBaixandoId(execucaoId);
    try {
      const itensExecucao = await getAutomacaoExecucaoItens(execucaoId);
      const linhas = itensExecucao.map((i) => [
        ROTULO_FILA[i.origem],
        i.servicoGdis ?? "",
        i.matricula ?? "",
        i.colaborador ?? "",
        i.tipoEquipamento ?? "",
        i.serialAnterior ?? "",
        i.serialEncontrado ?? "",
        ROTULO_RESULTADO[i.resultado] ?? i.resultado,
        i.observacao ?? "",
        i.modo === "MANUAL" ? "Manual" : "Automático",
        new Date(i.criadoEm).toLocaleString("pt-BR"),
      ]);
      baixarCsv(
        [...COLUNAS_BASE, "Modo", "Data/Hora"],
        linhas,
        `relatorio-automacao-gdis_${carimboArquivo(new Date(inicio))}.csv`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não consegui baixar essa rodada.");
    } finally {
      setBaixandoId(null);
    }
  };

  const rodando = etapa === "rodando";
  const qtdEncontrados = Object.values(status).filter((s) => s.tipo === "encontrado").length;
  const qtdGravados = Object.values(status).filter((s) => s.tipo === "gravado").length;
  const qtdAguardando = Object.values(status).filter((s) => s.tipo === "aguardando").length;
  const qtdFalhas = Object.values(status).filter((s) => s.tipo === "erro" || s.tipo === "vazio").length;
  const qtdDuplicados = Object.values(status).filter((s) => s.tipo === "gravado" && s.duplicado).length;
  const qtdProcessados = Object.keys(status).length;

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center gap-4 flex-shrink-0">
        <div className="flex-1">
          <h2 className="text-sm font-bold text-slate-900">Automação GDIS</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Consulta o serial de cada serviço direto no GDIS — medidores em recuperação e serviços
            pendentes de vínculo na Conferência.
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
                className="w-4 h-4 accent-sinal"
              />
              <Zap size={13} className={modoAutomatico ? "text-sinal" : "text-slate-400"} />
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
                  className="w-48 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-codigo focus:outline-none focus:ring-2 focus:ring-sinal-claro"
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
                  className="w-48 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-codigo focus:outline-none focus:ring-2 focus:ring-sinal-claro"
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
              <Loader2 size={14} className="animate-spin text-sinal" />
              <span className="text-xs text-slate-600 flex-1">
                Consultando… {qtdEncontrados} encontrado(s), {qtdGravados} gravado(s)
                {qtdDuplicados > 0 && ` (${qtdDuplicados} duplicado(s))`}
                {qtdAguardando > 0 && `, ${qtdAguardando} aguardando`}, {qtdFalhas} sem resultado.
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
                Finalizado: {qtdEncontrados} encontrado(s), {qtdGravados} gravado(s)
                {qtdDuplicados > 0 && ` (${qtdDuplicados} duplicado(s))`}
                {qtdAguardando > 0 && `, ${qtdAguardando} aguardando`}, {qtdFalhas} sem resultado.
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
            <div ref={logBoxRef} className="max-h-64 overflow-y-auto py-2 font-codigo text-[11px]">
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
                          ? "text-sinal-claro"
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
            <p className="text-sm font-bold text-slate-600">
              Nada pendente — nem na recuperação, nem na Conferência!
            </p>
          </div>
        )}

        {!loading && itens.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shrink-0">
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-3 flex-wrap">
              <span className="text-xs text-slate-600">
                <strong className="text-slate-900">{selecionados.length}</strong> selecionado(s) de {itensVisiveis.length}
              </span>

              {/* Filtro de fila — não separa a operação, só a visão. */}
              <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                {(
                  [
                    ["todas", `Todas (${itens.length})`],
                    ["RECUPERACAO", `Recuperação (${qtdRecuperacao})`],
                    ["CONFERENCIA", `Conferência (${qtdConferencia})`],
                  ] as [FiltroFila, string][]
                ).map(([valor, rotulo]) => (
                  <button
                    key={valor}
                    type="button"
                    onClick={() => {
                      setFiltroFila(valor);
                      setPagina(1);
                    }}
                    disabled={rodando}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors disabled:opacity-40 ${
                      filtroFila === valor ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {rotulo}
                  </button>
                ))}
              </div>

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
                  className="text-xs font-bold text-sinal hover:text-sinal-forte disabled:opacity-40"
                >
                  {paginaToda ? "Desmarcar página" : "Esta página"}
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={toggleTodos}
                  disabled={rodando}
                  className="text-xs font-bold text-sinal hover:text-sinal-forte disabled:opacity-40"
                >
                  {itensVisiveis.every((i) => selecionados.includes(i.chave))
                    ? "Desmarcar todos"
                    : `Todos (${itensVisiveis.length})`}
                </button>
              </div>
            </div>

            {itensVisiveis.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-400">Nenhum item nessa fila.</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-white border-b border-slate-100">
                        <th className="w-10 px-3 py-2"></th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Fila</th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Serviço</th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Matrícula</th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Colaborador</th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Equipamento</th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Serial encontrado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itensPagina.map((item) => {
                        const st = status[item.chave];
                        const sel = selecionados.includes(item.chave);
                        const serialEditado = seriaisEditados[item.chave] ?? "";
                        const deRecuperacao = item.origem === "RECUPERACAO";

                        return (
                          <tr
                            key={item.chave}
                            className={`border-b border-slate-50 last:border-0 transition-colors ${
                              sel ? "bg-sinal-fundo/40" : "hover:bg-slate-50"
                            }`}
                          >
                            <td className="px-3 py-2.5">
                              <input
                                type="checkbox"
                                checked={sel}
                                disabled={rodando}
                                onChange={() => toggleSelecionado(item.chave)}
                                className="w-4 h-4 accent-sinal"
                              />
                            </td>
                            <td className="px-4 py-2.5">
                              <span
                                className={`inline-block px-1.5 py-0.5 text-[10px] font-bold rounded ${
                                  deRecuperacao
                                    ? "bg-violet-50 text-violet-700 border border-violet-200"
                                    : "bg-sinal-fundo text-sinal-forte border border-sinal-fundo"
                                }`}
                              >
                                {ROTULO_FILA[item.origem]}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 font-codigo text-sm font-bold text-slate-800 whitespace-nowrap">
                              {item.servicoGdis}
                            </td>
                            <td className="px-4 py-2.5 text-xs text-slate-600 font-codigo whitespace-nowrap">
                              {item.matricula ?? <span className="text-slate-300">—</span>}
                            </td>
                            <td className="px-4 py-2.5 text-xs text-slate-600 max-w-[150px] truncate">
                              {deRecuperacao ? item.colaborador : <span className="text-slate-300">—</span>}
                            </td>
                            <td
                              className="px-4 py-2.5 text-xs text-slate-500 max-w-[170px] truncate"
                              title={deRecuperacao ? item.tipoEquipamento : undefined}
                            >
                              {deRecuperacao ? item.tipoEquipamento : <span className="text-slate-300">—</span>}
                            </td>
                            <td className="px-4 py-2.5">
                              {st?.tipo === "gravado" && st.duplicado ? (
                                <span
                                  className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-bold rounded-lg"
                                  title="Gravado, mas esse serial já existe em outra linha. Revisar duplicidade depois."
                                >
                                  <AlertTriangle size={12} />
                                  {st.serial} (duplicado)
                                </span>
                              ) : st?.tipo === "gravado" ? (
                                <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-lg">
                                  <CheckCircle2 size={12} />
                                  {st.serial}
                                </span>
                              ) : st?.tipo === "aguardando" ? (
                                <span
                                  className="inline-flex items-center gap-1.5 px-2 py-1 bg-sinal-fundo border border-sinal-fundo text-sinal-forte text-[11px] font-bold rounded-lg"
                                  title="Serial não bate com nenhum medidor pendente no cadastro. Serviço segue aguardando na Conferência."
                                >
                                  <Clock size={12} />
                                  {st.serial} (aguardando)
                                </span>
                              ) : st?.tipo === "consultando" ? (
                                <span className="inline-flex items-center gap-1.5 text-xs text-sinal font-semibold">
                                  <Loader2 size={12} className="animate-spin" />
                                  Consultando…
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
                                      setSeriaisEditados((prev) => ({ ...prev, [item.chave]: e.target.value }))
                                    }
                                    placeholder="—"
                                    className="w-36 px-2 py-1 border border-slate-300 rounded-lg text-xs font-codigo font-semibold focus:outline-none focus:ring-2 focus:ring-sinal-claro"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => gravarSerial(item.chave, serialEditado.trim(), "MANUAL")}
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
                    {(pagina - 1) * TAMANHO_PAGINA + 1}–{Math.min(pagina * TAMANHO_PAGINA, itensVisiveis.length)} de{" "}
                    {itensVisiveis.length}
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
              </>
            )}
          </div>
        )}

        {/* ── Rodadas anteriores ── */}
        {execucoes.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shrink-0">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
              <History size={13} className="text-slate-400" />
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Rodadas anteriores</span>
              <span className="ml-auto text-[11px] text-slate-400">{execucoes.length}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-4 py-2 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Quando</th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Quem</th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Resultado</th>
                    <th className="w-10 px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {execucoes.map((e) => (
                    <tr key={e.execucaoId} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-2.5 text-xs text-slate-700 whitespace-nowrap">
                        {new Date(e.inicio).toLocaleString("pt-BR")}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-600 max-w-[160px] truncate">{e.executadoPor}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2 flex-wrap text-[11px] font-bold">
                          <span className="text-slate-500">{e.total} linha(s)</span>
                          {e.gravados > 0 && <span className="text-emerald-700">{e.gravados} gravado(s)</span>}
                          {e.conflitos > 0 && (
                            <span className="text-amber-700">{e.conflitos} duplicado(s)</span>
                          )}
                          {e.aguardando > 0 && <span className="text-sinal-forte">{e.aguardando} aguardando</span>}
                          {e.vazios > 0 && <span className="text-amber-700">{e.vazios} sem serial</span>}
                          {e.erros > 0 && <span className="text-amber-700">{e.erros} erro(s)</span>}
                          {e.encontrados > 0 && <span className="text-sinal-forte">{e.encontrados} não gravado(s)</span>}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <button
                          type="button"
                          onClick={() => baixarExecucao(e.execucaoId, e.inicio)}
                          disabled={baixandoId === e.execucaoId}
                          title="Baixar CSV desta rodada"
                          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-40"
                        >
                          {baixandoId === e.execucaoId ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Download size={14} />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
