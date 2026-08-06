import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env: Record<string, string> = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const testColab = {
    matricula: 'e00001',
    nome: 'Colaborador Teste',
    supervisor: 'Pedro',
    gc: 'breno',
    go: 'amarildo'
  };

  const { data, error } = await supabase
    .from('colaboradores')
    .upsert([testColab], { onConflict: 'matricula' })
    .select();

  if (error) {
    console.error('Erro ao criar colaborador:', error);
  } else {
    console.log('Colaborador criado com sucesso:', data);
  }
}

main();
