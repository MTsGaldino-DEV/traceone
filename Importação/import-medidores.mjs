// import-medidores.mjs
// Importação em massa do histórico consolidado (medidores_limpo.csv) para o Supabase.
//
// Uso:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node import-medidores.mjs
//
// Requer: npm install @supabase/supabase-js csv-parse
//
// IMPORTANTE: ajustar os nomes de colunas abaixo para bater exatamente com
// a migration 001_initial_schema.sql do repo, caso divirjam.

import { createClient } from "@supabase/supabase-js";
import { parse } from "csv-parse/sync";
import fs from "fs";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CSV_PATH = "./medidores_limpo.csv";

function readCsv() {
  const content = fs.readFileSync(CSV_PATH, "utf-8");
  return parse(content, {
    columns: true,
    delimiter: ";",
    skip_empty_lines: true,
  });
}

async function main() {
  const rows = readCsv();
  console.log(`Lidas ${rows.length} linhas do CSV.`);

  // 1) Distinct tipos_de_medidores (sap + valor). tipo / tipo_ligacao ficam NULL
  //    até a lista complementar ser enviada.
  const tiposMap = new Map();
  for (const r of rows) {
    if (!tiposMap.has(r.material_sap)) {
      tiposMap.set(r.material_sap, {
        cod_sap: r.material_sap,
        valor: r.valor_equipamento ? Number(r.valor_equipamento) : 0,
        tipo: "(a definir)",          // será atualizado via UPDATE posterior
        ligacao: "direto",            // placeholder — CHECK aceita 'direto'|'indireto'
      });
    }
  }
  const tipos = [...tiposMap.values()];
  console.log(`Upsert de ${tipos.length} tipos_de_medidores...`);
  {
    const { error } = await supabase
      .from("tipos_de_medidores")
      .upsert(tipos, { onConflict: "cod_sap" });
    if (error) throw new Error("Erro em tipos_de_medidores: " + error.message);
  }

  // 2) Distinct colaboradores (matricula já normalizada em minúsculo no CSV
  //    de origem; o trigger do banco também garante isso). GC/GO ficam NULL.
  const colabMap = new Map();
  for (const r of rows) {
    if (!colabMap.has(r.matricula)) {
      colabMap.set(r.matricula, {
        matricula: r.matricula,
        nome: r.colaborador,
        supervisor: r.supervisor,
        gc: null,
        go: null,
      });
    }
  }
  const colaboradores = [...colabMap.values()];
  console.log(`Insert de ${colaboradores.length} colaboradores (ON CONFLICT DO NOTHING)...`);
  {
    const { error } = await supabase
      .from("colaboradores")
      .upsert(colaboradores, { onConflict: "matricula", ignoreDuplicates: true });
    if (error) throw new Error("Erro em colaboradores: " + error.message);
  }

  // 3) medidores_list — histórico consolidado, inserido diretamente
  //    (não passa pelo match_medidores(), pois já vem com status resolvido).
  // Sanitiza datas: converte datas inválidas (ex: '1900-01-00') para null
  function safeDate(v) {
    if (!v) return null;
    if (/\-00$/.test(v)) return null; // dia ou mês zero não existe
    const d = new Date(v);
    if (isNaN(d.getTime())) return null;
    return v;
  }

  const medidores = rows.map((r) => ({
    data: safeDate(r.data_atribuicao),
    material_sap: r.material_sap,
    serial: r.serial,
    matricula: r.matricula,
    servico_gdis: null,               // FK para servicos_report vazia; histórico não precisa desse vínculo
    status: r.status, // 'CONCLUIDO' | 'PENDENTE'
    data_conclusao: safeDate(r.data_conclusao),
    servico_campo: r.servico_campo || null,
    equipe: r.equipe || null,
  }));

  console.log(`Inserindo ${medidores.length} registros em medidores_list...`);
  const BATCH = 500;
  for (let i = 0; i < medidores.length; i += BATCH) {
    const batch = medidores.slice(i, i + BATCH);
    const { error } = await supabase.from("medidores_list").insert(batch);
    if (error) {
      console.error(`Erro no lote ${i}-${i + batch.length}:`, error.message);
      throw error;
    }
    console.log(`  ...lote ${i + batch.length}/${medidores.length} ok`);
  }

  console.log("Importação concluída com sucesso.");
}

main().catch((err) => {
  console.error("Falha na importação:", err);
  process.exit(1);
});
