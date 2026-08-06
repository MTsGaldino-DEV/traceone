// update-tipos-medidores.mjs
// Atualiza tipos_de_medidores com dados completos do tipos_de_medidores.CSV
// Uso: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node update-tipos-medidores.mjs

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
const CSV_PATH = "./tipos_de_medidores.CSV";

function parseValor(v) {
  if (!v) return 0;
  // Remove espaços, troca ponto de milhar e vírgula decimal
  return parseFloat(v.trim().replace(/\./g, "").replace(",", ".")) || 0;
}

function parseLigacao(v) {
  const s = (v || "").trim().toLowerCase();
  if (s === "indireto") return "indireto";
  return "direto"; // default
}

async function main() {
  const content = fs.readFileSync(CSV_PATH, "utf-8");
  const rows = parse(content, {
    columns: ["cod_sap", "tipo", "ligacao", "valor"],
    delimiter: ";",
    skip_empty_lines: true,
    from_line: 2, // pula header
  });

  console.log(`Lidas ${rows.length} linhas do CSV de tipos de medidores.`);

  const tipos = rows.map((r) => ({
    cod_sap: r.cod_sap.trim(),
    tipo: r.tipo.trim(),
    ligacao: parseLigacao(r.ligacao),
    valor: parseValor(r.valor),
    ativo: true,
  }));

  // Mostrar o que vai ser inserido/atualizado
  tipos.forEach((t) =>
    console.log(`  [${t.cod_sap}] ${t.tipo} | ${t.ligacao} | R$ ${t.valor}`)
  );

  // Passo 1: INSERT dos novos (ignoreDuplicates para não travar em conflito de PK)
  console.log(`\nInserindo novos tipos (ON CONFLICT DO NOTHING)...`);
  const { error: insertErr } = await supabase
    .from("tipos_de_medidores")
    .upsert(tipos, { onConflict: "cod_sap", ignoreDuplicates: true });
  if (insertErr) {
    console.error("Erro no insert:", insertErr.message);
    process.exit(1);
  }

  // Passo 2: UPDATE individual de cada tipo para garantir tipo/ligacao/valor corretos
  // (evita trigger de updated_at que foi dropado, mas por segurança usamos update individual)
  console.log(`Atualizando ${tipos.length} tipos via UPDATE...`);
  let ok = 0,
    erros = 0;
  for (const t of tipos) {
    const { error } = await supabase
      .from("tipos_de_medidores")
      .update({ tipo: t.tipo, ligacao: t.ligacao, valor: t.valor, ativo: true })
      .eq("cod_sap", t.cod_sap);
    if (error) {
      console.error(`  Erro em ${t.cod_sap}:`, error.message);
      erros++;
    } else {
      ok++;
    }
  }
  console.log(`  Atualizados: ${ok}, Erros: ${erros}`);

  // Validação final
  const { data: final, count } = await supabase
    .from("tipos_de_medidores")
    .select("cod_sap, tipo, ligacao, valor", { count: "exact" });
  console.log(`\nTotal de tipos no banco agora: ${count}`);

  // Verificar se algum medidor ficou sem tipo válido (FK órfã)
  const { data: usados } = await supabase
    .from("medidores_list")
    .select("material_sap");
  const usadosSet = new Set(usados.map((r) => r.material_sap));
  const tiposSet = new Set(final.map((t) => t.cod_sap));
  const faltando = [...usadosSet].filter((s) => !tiposSet.has(s));
  if (faltando.length > 0) {
    console.error(
      "\n⚠️  ATENÇÃO: cod_sap usados em medidores_list SEM tipo cadastrado:",
      faltando
    );
  } else {
    console.log(
      "\n✅ Todos os cod_sap de medidores_list têm tipo cadastrado. Nenhum medidor órfão."
    );
  }

  console.log("\n=== TIPOS CADASTRADOS ===");
  final
    .sort((a, b) => a.cod_sap.localeCompare(b.cod_sap))
    .forEach((t) =>
      console.log(
        `  ${t.cod_sap} | ${t.tipo} | ${t.ligacao} | R$ ${t.valor}`
      )
    );
}

main().catch((err) => {
  console.error("Falha:", err);
  process.exit(1);
});
