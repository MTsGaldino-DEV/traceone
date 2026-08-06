import postgres from 'postgres';
import * as fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env: Record<string, string> = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const password = env.SUPABASE_DB_PASSWORD;

async function main() {
  const sql = postgres(`postgres://postgres.ctlaygzndbaojxpwqsco:${encodeURIComponent(password)}@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`, {
    ssl: 'require',
    max: 1,
  });

  try {
    console.log("1. Add enum value if not exists...");
    const enums = await sql`SELECT enumlabel FROM pg_enum WHERE enumtypid = 'status_medidor'::regtype`;
    const hasReatribuido = enums.some(e => e.enumlabel === 'REATRIBUIDO');
    if (!hasReatribuido) {
      await sql.unsafe("ALTER TYPE status_medidor ADD VALUE 'REATRIBUIDO'");
      console.log("   ✅ Added REATRIBUIDO");
    } else {
      console.log("   ✅ REATRIBUIDO already exists");
    }

    console.log("2. Add columns to medidores_list...");
    await sql.unsafe(`
      ALTER TABLE medidores_list
        ADD COLUMN IF NOT EXISTS reatribuido_de_id    UUID REFERENCES medidores_list(id),
        ADD COLUMN IF NOT EXISTS reatribuido_para_id  UUID REFERENCES medidores_list(id),
        ADD COLUMN IF NOT EXISTS data_reatribuicao    TIMESTAMPTZ;
    `);
    console.log("   ✅ Columns added");

    console.log("3. Cleanup duplicate PENDENTE rows...");
    const dupes = await sql`
      SELECT serial, COUNT(*) as cnt, array_agg(id ORDER BY created_at ASC) as ids
      FROM medidores_list
      WHERE status = 'PENDENTE'
      GROUP BY serial
      HAVING COUNT(*) > 1
    `;

    if (dupes.length > 0) {
      console.log(`   ⚠️ Found ${dupes.length} duplicates. Resolving...`);
      for (const d of dupes) {
        const ids: string[] = d.ids;
        const toMark = ids.slice(0, -1);
        await sql`
          UPDATE medidores_list
          SET status = 'REATRIBUIDO', data_reatribuicao = NOW()
          WHERE id = ANY(${toMark}::uuid[])
        `;
      }
    }
    console.log("   ✅ Duplicates resolved");

    console.log("4. Create unique partial index...");
    await sql.unsafe(`DROP INDEX IF EXISTS idx_medidor_serial_pendente_unico;`);
    await sql.unsafe(`
      CREATE UNIQUE INDEX idx_medidor_serial_pendente_unico
        ON medidores_list (serial)
        WHERE status = 'PENDENTE';
    `);
    console.log("   ✅ Index created");

    console.log("5. Recreate vw_medidores_completo...");
    await sql.unsafe(`
      CREATE OR REPLACE VIEW vw_medidores_completo AS
      SELECT
        ml.id,
        ml.data                                   AS "Data",
        ml.material_sap                           AS "Material SAP",
        ml.serial                                 AS "Serial",
        ml.matricula                              AS "MATRICULA",
        c.nome                                    AS "COLABORADOR",
        c.supervisor                              AS "SUPERVISOR",
        ml.servico_gdis                           AS "SERVIÇO GDIS",
        ml.status                                 AS "Concluído/Pendente",
        t.valor                                   AS "VALOR",
        t.tipo                                    AS "EQUIPAMENTO",
        (COALESCE(ml.data_conclusao, CURRENT_DATE) - ml.data) AS "DIAS DE ATRIBUIÇÃO",
        ml.data_conclusao                         AS "Data da conclusão",
        ml.atualizacao                            AS "ATUALIZAÇÃO",
        ml.servico_campo                          AS "SERVIÇO CAMPO",
        ml.equipe                                 AS "EQUIPE",
        ml.reatribuido_de_id,
        ml.reatribuido_para_id,
        ml.data_reatribuicao
      FROM medidores_list ml
      JOIN colaboradores c ON c.matricula = ml.matricula
      JOIN tipos_de_medidores t ON t.cod_sap = ml.material_sap
      WHERE ml.status <> 'REATRIBUIDO';
    `);
    console.log("   ✅ View recreated");
    
    console.log("✅ ALL DONE!");

  } catch (err: any) {
    console.error('❌ Error:', err.message);
  } finally {
    await sql.end();
  }
}

main();
