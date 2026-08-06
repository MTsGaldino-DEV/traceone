import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const envFile = fs.readFileSync(path.resolve(__dirname, '.env.local'), 'utf8');
const env: Record<string, string> = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=#][^=]*)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não definidos em .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const csv = fs.readFileSync('../Importação/colaboradores_limpo.csv', 'utf8');
  const lines = csv.split('\n').filter(l => l.trim().length > 0);
  
  const dataToUpsert = [];
  // matricula;nome;supervisor;gc;go
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(';');
    if (parts.length >= 5) {
      dataToUpsert.push({
        matricula: parts[0].trim(),
        nome: parts[1].trim(),
        supervisor: parts[2].trim(),
        gc: parts[3].trim(),
        go: parts[4].trim()
      });
    }
  }

  console.log(`Upserting ${dataToUpsert.length} records...`);
  const { data, error } = await supabase.from('colaboradores').upsert(dataToUpsert, { onConflict: 'matricula' });
  if (error) {
    console.error('Error inserting:', error);
  } else {
    console.log('Success!');
  }
}
main();
