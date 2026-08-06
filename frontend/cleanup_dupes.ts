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
    // 1. Find duplicate PENDENTE serials
    const dupes = await sql`
      SELECT serial, COUNT(*) as cnt, array_agg(id ORDER BY created_at ASC) as ids
      FROM medidores_list
      WHERE status = 'PENDENTE'
      GROUP BY serial
      HAVING COUNT(*) > 1
    `;

    if (dupes.length === 0) {
      console.log('✅ No duplicate PENDENTE serials found.');
    } else {
      console.log(`⚠️  Found ${dupes.length} serials with duplicate PENDENTE rows:`);
      for (const d of dupes) {
        console.log(`   Serial: ${d.serial}, Count: ${d.cnt}, IDs: ${d.ids}`);
      }

      // 2. For each duplicate, keep the LATEST one as PENDENTE, mark older ones as REATRIBUIDO
      for (const d of dupes) {
        const ids: string[] = d.ids;
        const toMark = ids.slice(0, -1); // all but last (oldest ones)
        console.log(`   Marking ${toMark.length} older row(s) for serial "${d.serial}" as REATRIBUIDO...`);
        await sql`
          UPDATE medidores_list
          SET status = 'REATRIBUIDO', data_reatribuicao = NOW()
          WHERE id = ANY(${toMark}::uuid[])
        `;
      }
      console.log('✅ Duplicates resolved.');
    }

    // 3. Now create the unique partial index
    console.log('\nCreating unique partial index...');
    try {
      await sql`
        CREATE UNIQUE INDEX idx_medidor_serial_pendente_unico
          ON medidores_list (serial)
          WHERE status = 'PENDENTE'
      `;
      console.log('✅ Unique index created!');
    } catch (err: any) {
      if (err.message.includes('already exists')) {
        console.log('⚠️  Index already exists, skipping.');
      } else {
        throw err;
      }
    }

    // 4. Verify
    const check = await sql`
      SELECT COUNT(DISTINCT serial) as unique_serials,
             COUNT(*) as total_pendente
      FROM medidores_list WHERE status = 'PENDENTE'
    `;
    console.log(`\n📊 Status: ${check[0].total_pendente} PENDENTE rows, ${check[0].unique_serials} unique serials. Index enforced!`);

  } catch (err: any) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
