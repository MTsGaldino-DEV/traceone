"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
  Table2,
  ArrowRight,
} from "lucide-react";
import { importServicos } from "../../../lib/api";
import * as XLSX from "xlsx";

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface ParsedRow {
  servico: string;
  matricula?: string;
  termino: string;
  cod_serv?: string;
  tipo_serv?: string;
}

interface ParseResult {
  rows: ParsedRow[];
  errors: string[];
}

// ─── Parser CSV/Excel ────────────────────────────────────────────────────────
const COL_ALIASES: Record<string, string> = {
  // servico
  "servico": "servico",
  "serviço": "servico",
  "servico gdis": "servico",
  "nº serviço": "servico",
  "numero servico": "servico",
  "n servico": "servico",
  // matricula
  "matricula": "matricula",
  "matrícula": "matricula",
  // termino
  "termino": "termino",
  "término": "termino",
  "data conclusao": "termino",
  "data conclusão": "termino",
  "conclusao": "termino",
  "conclusão": "termino",
  // cod_serv
  "cod serv": "cod_serv",
  "cod_serv": "cod_serv",
  "codigo servico": "cod_serv",
  "código serviço": "cod_serv",
  // tipo_serv
  "tipo serv": "tipo_serv",
  "tipo_serv": "tipo_serv",
  "tipo servico": "tipo_serv",
  "tipo serviço": "tipo_serv",
};

function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 _]/g, "")
    .trim();
}

function parseDate(raw: any): string | null {
  if (!raw) return null;
  // Se já for numérico (Excel date value)
  if (typeof raw === "number") {
    // converter do excel para JS date
    const d = new Date(Math.round((raw - 25569) * 864e5));
    return d.toISOString();
  }
  
  const str = String(raw).trim();
  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}T00:00:00Z`;
  // YYYY-MM-DD
  const ymd = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) return `${str.slice(0, 10)}T00:00:00Z`;
  
  // Tentar parse nativo se tudo falhar
  const t = new Date(str);
  if (!isNaN(t.getTime())) return t.toISOString();
  
  return null;
}

function parseWorkbook(buffer: ArrayBuffer): ParseResult {
  const wb = XLSX.read(buffer, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
  
  const errors: string[] = [];
  const rows: ParsedRow[] = [];

  // Encontrar linha de cabeçalho nas primeiras 30 linhas
  let headerIdx = -1;
  let headers: string[] = [];
  
  for (let i = 0; i < Math.min(data.length, 30); i++) {
    const row = data[i];
    if (!Array.isArray(row)) continue;
    const normalized = row.map(cell => (cell ? normalizeHeader(String(cell)) : ""));
    if (normalized.some(h => COL_ALIASES[h] === "servico")) {
      headerIdx = i;
      headers = normalized;
      break;
    }
  }

  if (headerIdx === -1) {
    return {
      rows: [],
      errors: ["Não foi possível encontrar a coluna 'Serviço' (ou similar) nas primeiras 30 linhas. Verifique o arquivo."],
    };
  }

  // Mapear colunas
  const colMap: Record<string, number> = {};
  headers.forEach((h, idx) => {
    const mapped = COL_ALIASES[h];
    if (mapped && !(mapped in colMap)) colMap[mapped] = idx;
  });

  if (!("servico" in colMap)) {
    return { rows: [], errors: ["Coluna 'Serviço' não encontrada."] };
  }
  if (!("termino" in colMap)) {
    return { rows: [], errors: ["Coluna de data de término não encontrada."] };
  }

  // Ler linhas de dados
  for (let i = headerIdx + 1; i < data.length; i++) {
    const rowData = data[i];
    if (!Array.isArray(rowData) || rowData.length === 0) continue;
    
    const rawServico = rowData[colMap["servico"]];
    if (!rawServico) continue;
    const servico = String(rawServico).trim();
    if (!servico) continue;

    const rawTermino = rowData[colMap["termino"]];
    const termino = parseDate(rawTermino);
    
    if (!termino) {
      errors.push(`Linha ${i + 1}: data de término inválida ("${rawTermino}") — linha ignorada.`);
      continue;
    }

    const mat = colMap["matricula"] !== undefined ? rowData[colMap["matricula"]] : undefined;
    const cod = colMap["cod_serv"] !== undefined ? rowData[colMap["cod_serv"]] : undefined;
    const tipo = colMap["tipo_serv"] !== undefined ? rowData[colMap["tipo_serv"]] : undefined;

    rows.push({
      servico,
      matricula: mat ? String(mat).trim() : undefined,
      termino,
      cod_serv: cod ? String(cod).trim() : undefined,
      tipo_serv: tipo ? String(tipo).trim() : undefined,
    });
  }

  return { rows, errors };
}

// ─── Página ───────────────────────────────────────────────────────────────────
export default function ImportacaoPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<number | null>(null);

  const processFile = useCallback((f: File) => {
    setFile(f);
    setParsed(null);
    setImportError(null);
    setImportSuccess(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const result = parseWorkbook(buffer);
        setParsed(result);
      } catch (err) {
        setParsed({
          rows: [],
          errors: ["Falha ao ler o arquivo. Tem certeza que é um arquivo Excel/CSV válido?"],
        });
      }
    };
    reader.readAsArrayBuffer(f);
  }, []);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  };

  const handleImport = async () => {
    if (!parsed || parsed.rows.length === 0) return;
    setImporting(true);
    setImportError(null);
    try {
      await importServicos(parsed.rows);
      setImportSuccess(parsed.rows.length);
      // Redirecionar para Conferência após 1.5s
      setTimeout(() => {
        router.push("/dashboard/conferencia");
      }, 1500);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Erro ao importar.");
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setFile(null);
    setParsed(null);
    setImportError(null);
    setImportSuccess(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const hasRows = (parsed?.rows.length ?? 0) > 0;
  const hasErrors = (parsed?.errors.length ?? 0) > 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-[#0f172a]">Importar Relatório GDIS</h2>
        <p className="text-sm text-[#64748b] mt-0.5">
          Faça upload do relatório Excel/CSV exportado do GDIS.
        </p>
      </div>

      {/* Success */}
      {importSuccess !== null && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800">
          <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
          <div>
            <p className="text-sm font-bold">Importação concluída!</p>
            <p className="text-xs text-emerald-600 mt-0.5">
              {importSuccess} serviço{importSuccess !== 1 ? "s" : ""} importado{importSuccess !== 1 ? "s" : ""}. Redirecionando para a Conferência…
            </p>
          </div>
        </div>
      )}

      {/* Import error */}
      {importError && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800">
          <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-bold">Erro na importação</p>
            <p className="text-xs text-red-600 mt-0.5">{importError}</p>
          </div>
          <button onClick={() => setImportError(null)} className="text-red-400 hover:text-red-600">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Drop zone */}
      {!file && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleFileDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-4 p-12 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
            dragging
              ? "border-blue-500 bg-blue-50"
              : "border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/50"
          }`}
        >
          <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center">
            <UploadCloud size={28} className="text-blue-600" />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-slate-800">
              Arraste o arquivo Excel/CSV aqui ou clique
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Suporte: .xlsx, .xls, .csv
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}

      {/* File selected */}
      {file && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          {/* File info */}
          <div className="flex items-center gap-3 p-4 border-b border-slate-100 bg-slate-50/50">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
              <FileText size={18} className="text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{file.name}</p>
              <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
            <button
              onClick={reset}
              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Remover arquivo"
            >
              <X size={16} />
            </button>
          </div>

          {/* Parse result */}
          {parsed ? (
            <div className="p-4 space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                  <p className="text-2xl font-black text-emerald-700">{parsed.rows.length}</p>
                  <p className="text-xs font-semibold text-emerald-600 mt-0.5">Serviços válidos</p>
                </div>
                <div className={`p-3 border rounded-xl text-center ${parsed.errors.length > 0 ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200"}`}>
                  <p className={`text-2xl font-black ${parsed.errors.length > 0 ? "text-amber-700" : "text-slate-400"}`}>{parsed.errors.length}</p>
                  <p className={`text-xs font-semibold mt-0.5 ${parsed.errors.length > 0 ? "text-amber-600" : "text-slate-400"}`}>
                    {parsed.errors.length > 0 ? "Avisos / erros" : "Sem erros"}
                  </p>
                </div>
              </div>

              {/* Errors list */}
              {hasErrors && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                  <p className="text-xs font-bold text-amber-800 mb-2">Avisos de parse:</p>
                  <div className="max-h-32 overflow-y-auto">
                    {parsed.errors.map((e, i) => (
                      <p key={i} className="text-xs text-amber-700 flex items-start gap-1.5 mb-1">
                        <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                        {e}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview table */}
              {hasRows && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Table2 size={14} className="text-slate-400" />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                      Pré-visualização (primeiras 5 linhas)
                    </span>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          {["Serviço", "Matrícula", "Término", "Cód. Serv.", "Tipo Serv."].map((h) => (
                            <th key={h} className="px-3 py-2 text-left font-bold text-slate-600 whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {parsed.rows.slice(0, 5).map((row, i) => (
                          <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                            <td className="px-3 py-2 font-mono font-semibold text-slate-800">{row.servico}</td>
                            <td className="px-3 py-2 font-mono text-slate-600">{row.matricula ?? "—"}</td>
                            <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{row.termino.slice(0, 10)}</td>
                            <td className="px-3 py-2 text-slate-600">{row.cod_serv ?? "—"}</td>
                            <td className="px-3 py-2 text-slate-600">{row.tipo_serv ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {parsed.rows.length > 5 && (
                    <p className="text-xs text-slate-400 mt-1 text-right">
                      + {parsed.rows.length - 5} linhas adicionais
                    </p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={reset}
                  disabled={importing}
                  className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 font-semibold text-sm rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={!hasRows || importing || importSuccess !== null}
                  className="flex-1 px-4 py-2.5 bg-[#1e3a5f] text-white font-bold text-sm rounded-xl hover:bg-[#2d5282] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
                >
                  {importing ? (
                    <><Loader2 size={16} className="animate-spin" /> Importando…</>
                  ) : importSuccess !== null ? (
                    <><CheckCircle2 size={16} /> Importado!</>
                  ) : (
                    <>
                      Importar {parsed.rows.length} serviço{parsed.rows.length !== 1 ? "s" : ""}
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 flex items-center justify-center gap-2 text-slate-500">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm">Processando arquivo…</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
