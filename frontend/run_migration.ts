import postgres from 'postgres';
import * as fs from 'fs';
import * as path from 'path';

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
  const migrationFile = process.argv[2];
  if (!migrationFile) {
    console.error('Usage: npx tsx run_migration.ts <migration_file.sql>');
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(path.resolve(migrationFile), 'utf8');
  console.log(`Running migration: ${migrationFile}`);

  try {
    await sql.unsafe(sqlContent);
    console.log('✅ Migration completed successfully!');
  } catch (err: any) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
