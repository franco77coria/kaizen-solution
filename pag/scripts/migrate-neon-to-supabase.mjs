/**
 * Migration script: Neon → Supabase
 * Copies all data from every Prisma-managed table.
 */
import pg from "pg";
const { Client } = pg;

const NEON_URL =
  "postgresql://neondb_owner:npg_CxNuKX8s4neg@ep-round-waterfall-ah8wbvs8-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require";

const SUPABASE_URL =
  "postgresql://postgres:kaizen_gerencia_2026@db.wxavprkatbivfltflirf.supabase.co:5432/postgres";

// Tables in dependency order (parents first)
const TABLES = [
  "User",
  "SiteConfig",
  "Service",
  "Project",
  "Testimonial",
  "ContactSubmission",
  "ChatLead",
  "WhatsAppConfig",
  "WhatsAppMessage",
  "WhatsAppContact",
  "ContactList",
  "WhatsAppTemplate",
  "WhatsAppLog",
  "TwilioSender",
  "ElevenLabsConfig",
  "AudioMessageCache",
  "MediaCache",
  "ApiUsageLog",
  // Tables with foreign keys last
  "ListSubscriber",
  "WhatsAppCampaign",
  "CampaignJob",
];

async function migrate() {
  const neon = new Client({ connectionString: NEON_URL });
  const supa = new Client({ connectionString: SUPABASE_URL });

  try {
    await neon.connect();
    console.log("Connected to Neon");
    await supa.connect();
    console.log("Connected to Supabase");

    for (const table of TABLES) {
      // Prisma uses quoted table names
      const quotedTable = `"${table}"`;

      // Get row count from Neon
      const countResult = await neon.query(
        `SELECT COUNT(*) FROM ${quotedTable}`
      );
      const count = parseInt(countResult.rows[0].count);

      if (count === 0) {
        console.log(`  ${table}: 0 rows (skipped)`);
        continue;
      }

      // Fetch all rows
      const { rows, fields } = await neon.query(
        `SELECT * FROM ${quotedTable}`
      );
      const columns = fields.map((f) => `"${f.name}"`);

      // Batch insert (chunks of 100 rows)
      const BATCH_SIZE = 100;
      let inserted = 0;

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
        await supa.query(sql, values);
        inserted += batch.length;
      }

      console.log(`  ${table}: ${inserted} rows migrated`);
    }

    console.log("\nMigration complete!");
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  } finally {
    await neon.end();
    await supa.end();
  }
}

migrate();
