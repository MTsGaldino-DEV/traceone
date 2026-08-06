import postgres from 'postgres';
import * as fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env: Record<string, string> = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const password = env.SUPABASE_DB_PASSWORD;

async function tryConnect(host: string, port: number) {
  console.log(`Trying ${host}:${port}...`);
  const sql = postgres(`postgres://postgres.ctlaygzndbaojxpwqsco:${encodeURIComponent(password)}@${host}:${port}/postgres`, {
    ssl: 'require',
    connect_timeout: 5
  });
  try {
    await sql`
      ALTER TABLE servicos_report DROP CONSTRAINT IF EXISTS servicos_report_matricula_fkey;
    `;
    
    console.log('SUCCESS on', host, ' - Chave estrangeira de matricula removida de servicos_report');
    await sql.end();
    return true;
  } catch (err: any) {
    console.log('Failed on', host, err.message);
    await sql.end();
    return false;
  }
}

async function main() {
  const hosts = [
    'aws-0-sa-east-1.pooler.supabase.com',
    'aws-0-us-east-1.pooler.supabase.com',
    'aws-0-us-west-1.pooler.supabase.com',
    'aws-0-eu-central-1.pooler.supabase.com',
  ];
  for (const h of hosts) {
    if (await tryConnect(h, 6543)) break;
    if (await tryConnect(h, 5432)) break;
  }
}

main();
