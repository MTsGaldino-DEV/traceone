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
    console.log("Checking enum...");
    const enums = await sql`SELECT enumlabel FROM pg_enum WHERE enumtypid = 'status_medidor'::regtype`;
    console.log(enums);
    
    const hasReatribuido = enums.some(e => e.enumlabel === 'REATRIBUIDO');
    
    if (!hasReatribuido) {
      console.log("Adding REATRIBUIDO...");
      // Must be outside a transaction block
      await sql.unsafe("ALTER TYPE status_medidor ADD VALUE 'REATRIBUIDO'");
      console.log("Added successfully!");
    } else {
      console.log("REATRIBUIDO already exists.");
    }
  } catch (err: any) {
    console.error('Error:', err.message);
  } finally {
    await sql.end();
  }
}

main();
