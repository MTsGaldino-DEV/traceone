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
  return parse(content, { columns: true, delimiter: ";", skip_empty_lines: true });
}

function safeDate(v) {
  if (!v || /\-00$/.test(v)) return null;
  const d = new Date(v);
  if (isNaN(d.getTime())) return null;
  return v;
}

async function main() {
  const rows = readCsv();
  console.log(`Lidas ${rows.length} linhas do CSV.`);

  const servicosMap = new Map();
  const updates = [];

  for (const r of rows) {
    if (r.servico_gdis && r.servico_gdis.trim() !== '') {
      servicosMap.set(r.servico_gdis, {
        servico: r.servico_gdis,
        matricula: r.matricula,
        termino: safeDate(r.data_conclusao) || safeDate(r.data_atribuicao) || null
      });

      updates.push({
        serial: r.serial,
        servico_gdis: r.servico_gdis
      });
    }
  }

  const servicos = [...servicosMap.values()];
  console.log(`Inserindo ${servicos.length} servicos em servicos_report...`);
  
  const BATCH = 500;
  for (let i = 0; i < servicos.length; i += BATCH) {
    const batch = servicos.slice(i, i + BATCH);
    const { error } = await supabase.from("servicos_report").upsert(batch, { onConflict: "servico", ignoreDuplicates: true });
    if (error) throw new Error("Erro em servicos_report: " + error.message);
    console.log(`  ...serviços lote ${i + batch.length}/${servicos.length} ok`);
  }

  console.log(`Atualizando ${updates.length} medidores com o servico_gdis...`);

  // Update medidores directly via RPC or update.
  // Since upsert might nullify other fields if we don't provide them, we should do individual updates or use a safe method.
  // We can do individual updates since there are only ~5000 records. With a Promise.all in chunks.
  
  async function updateMedidor(serial, servico_gdis) {
      const { error } = await supabase.from('medidores_list').update({ servico_gdis }).eq('serial', serial);
      if (error) console.error(`Erro serial ${serial}:`, error.message);
  }

  let count = 0;
  for (let i = 0; i < updates.length; i += 50) {
      const chunk = updates.slice(i, i + 50);
      await Promise.all(chunk.map(u => updateMedidor(u.serial, u.servico_gdis)));
      count += chunk.length;
      console.log(`  ...atualizados ${count}/${updates.length} medidores`);
  }

  console.log("Atualização de serviço GDIS concluída!");
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
