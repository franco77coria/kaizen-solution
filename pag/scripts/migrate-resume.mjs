/**
 * Resume migration: tables that failed or were skipped.
 * Uses smaller batches and row-by-row fallback for large data.
 */
import pg from "pg";
const { Client } = pg;

const NEON_URL =
  "postgresql://neondb_owner:npg_CxNuKX8s4neg@ep-round-waterfall-ah8wbvs8-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require";

const SUPABASE_URL =
  "postgresql://postgres:kaizen_gerencia_2026@db.wxavprkatbivfltflirf.supabase.co:5432/postgres";

// Only tables that still need migration
const TABLES = [
  "MediaCache",
  "ApiUsageLog",
  "ListSubscriber",
  "WhatsAppCampaign",
  "CampaignJob",
];

async function connectWithRetry(url, label) {
  const client = new Client({ connectionString: url, statement_timeout: 120000 });
  await client.connect();
  console.log(`Connected to ${label}`);
  return client;
}

async function migrate() {
  let neon = await connectWithRetry(NEON_URL, "Neon");
  let supa = await connectWithRetry(SUPABASE_URL, "Supabase");

  for (const table of TABLES) {
    const quotedTable = `"${table}"`;

    try {
      // Check how many already exist in Supabase
      const existingCount = await supa.query(`SELECT COUNT(*) FROM ${quotedTable}`);
      const existing = parseInt(existingCount.rows[0].count);

      const countResult = await neon.query(`SELECT COUNT(*) FROM ${quotedTable}`);
      const total = parseInt(countResult.rows[0].count);

      if (total === 0) {
        console.log(`  ${table}: 0 rows (skipped)`);
        continue;
      }

      if (existing >= total) {
        console.log(`  ${table}: already migrated (${existing} rows)`);
        continue;
      }

      console.log(`  ${table}: ${total} rows in Neon, ${existing} in Supabase. Migrating...`);

      // For MediaCache (has large base64 data), use tiny batches
      const BATCH_SIZE = table === "MediaCache" ? 5 : 50;

      // Fetch all rows from Neon
      const { rows, fields } = await neon.query(`SELECT * FROM ${quotedTable}`);
      const columns = fields.map((f) => `"${f.name}"`);

      let inserted = 0;
      let skipped = 0;

      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const values = [];
        const placeholders = [];

        batch.forEach((row, batchIdx) => {
          const rowPlaceholders = columns.map((_, colIdx) => {
            const paramIdx = batchIdx * columns.length + colIdx + 1;
            return `$${paramIdx}`;
          });
          placeholders.push(`(${rowPlaceholders.join(", ")})`);

          columns.forEach((col) => {
            const colName = col.replace(/"/g, "");
            values.push(row[colName]);
          });
        });

        const sql = `INSERT INTO ${quotedTable} (${columns.join(", ")}) VALUES ${placeholders.join(", ")} ON CONFLICT DO NOTHING`;

        try {
          const result = await supa.query(sql, values);
          inserted += result.rowCount;
          skipped += batch.length - result.rowCount;
        } catch (batchErr) {
          // If batch fails, try row by row
          console.log(`    Batch failed at offset ${i}, falling back to row-by-row...`);
          for (const row of batch) {
            const rowValues = columns.map((col) => row[col.replace(/"/g, "")]);
            const rowPlaceholders = columns.map((_, idx) => `$${idx + 1}`);
            const rowSql = `INSERT INTO ${quotedTable} (${columns.join(", ")}) VALUES (${rowPlaceholders.join(", ")}) ON CONFLICT DO NOTHING`;
            try {
              const r = await supa.query(rowSql, rowValues);
              inserted += r.rowCount;
              if (r.rowCount === 0) skipped++;
            } catch (rowErr) {
              console.log(`    Row error: ${rowErr.message.slice(0, 100)}`);
              skipped++;
            }
          }
        }

        if ((i + BATCH_SIZE) % 500 === 0 || i + BATCH_SIZE >= rows.length) {
          process.stdout.write(`    Progress: ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}\r`);
        }
      }

      console.log(`  ${table}: ${inserted} inserted, ${skipped} skipped (duplicates/errors)`);
    } catch (tableErr) {
      console.error(`  ${table} ERROR: ${tableErr.message}`);
      // Reconnect if connection dropped
      try { await supa.end(); } catch {}
      try { await neon.end(); } catch {}
      neon = await connectWithRetry(NEON_URL, "Neon (reconnected)");
      supa = await connectWithRetry(SUPABASE_URL, "Supabase (reconnected)");
    }
  }

  console.log("\nMigration resume complete!");
  await neon.end();
  await supa.end();
}

migrate();
