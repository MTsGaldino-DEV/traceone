import postgres from 'postgres';
import * as fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env: Record<string, string> = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const password = env.SUPABASE_DB_PASSWORD;
const sql = postgres(`postgres://postgres.ctlaygzndbaojxpwqsco:${encodeURIComponent(password)}@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`, {
  ssl: 'require',
  max: 1,
});

async function main() {
  try {
    const cols = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'servicos_report'
    `;
    console.log("Colunas de servicos_report:");
    console.log(cols.map(c => c.column_name));

    const routines = await sql`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_name = 'vincular_servico_medidor'
    `;
    console.log("RPC vincular_servico_medidor encontrada:", routines.length > 0);
    
  } catch (err: any) {
    console.error('Erro:', err.message);
  } finally {
    await sql.end();
  }
}

main();
