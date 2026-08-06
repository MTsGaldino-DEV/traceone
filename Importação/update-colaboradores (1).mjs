// update-colaboradores.mjs
// Upsert de colaboradores com supervisor, gc e go a partir de colaboradores_limpo.csv.
// Popula quem já existe (atualiza supervisor/gc/go) e cria quem ainda não existe.
//
// Uso:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node update-colaboradores.mjs
//
// Requer: npm install @supabase/supabase-js csv-parse

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

const CSV_PATH = "./colaboradores_limpo.csv";

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
  console.log(`Lidas ${rows.length} linhas do CSV de colaboradores.`);

  const colaboradores = rows.map((r) => ({
    matricula: r.matricula,
    nome: r.nome,
    supervisor: r.supervisor || null,
    gc: r.gc || null,
    go: r.go || null,
  }));

  // 1) Inserir novos (os já existentes são ignorados)
  console.log(`Inserindo novos colaboradores (ON CONFLICT DO NOTHING)...`);
  const { error: insertErr } = await supabase
    .from("colaboradores")
    .upsert(colaboradores, { onConflict: "matricula", ignoreDuplicates: true });
  if (insertErr) {
    console.error("Erro no insert:", insertErr.message);
    process.exit(1);
  }

  // 2) Atualizar gc/go/supervisor de todos via UPDATE individual
  //    (evita o trigger update_colaboradores_updated_at que tenta setar updated_at)
  console.log(`Atualizando gc/go/supervisor dos ${colaboradores.length} colaboradores...`);
  let ok = 0, erros = 0;
  await Promise.all(
    colaboradores.map(async (c) => {
      const { error } = await supabase
        .from("colaboradores")
        .update({ gc: c.gc, go: c.go, supervisor: c.supervisor, nome: c.nome })
        .eq("matricula", c.matricula);
      if (error) {
        console.error(`  Erro em ${c.matricula}:`, error.message);
        erros++;
      } else {
        ok++;
      }
    })
  );
  console.log(`  Atualizados: ${ok}, Erros: ${erros}`);

  // Sanity check
  const { count: total, error: countErr } = await supabase
    .from("colaboradores")
    .select("*", { count: "exact", head: true });
  if (!countErr) {
    console.log(`Total de colaboradores na base agora: ${total}`);
  }
}

main().catch((err) => {
  console.error("Falha no update:", err);
  process.exit(1);
});
