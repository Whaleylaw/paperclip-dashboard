import { createHash, randomBytes } from "node:crypto";

async function main() {
  // Dynamic import to handle module resolution
  const pg = await import("postgres");
  const postgres = pg.default;
  
  const sql = postgres(process.env.DATABASE_URL);
  const token = `pcp_bootstrap_${randomBytes(24).toString("hex")}`;
  const hash = createHash("sha256").update(token).digest("hex");
  const expires = new Date(Date.now() + 72 * 3600000);

  try {
    // First revoke any existing bootstrap invites
    await sql`
      UPDATE invites SET revoked_at = NOW(), updated_at = NOW()
      WHERE invite_type = 'bootstrap_ceo' AND revoked_at IS NULL AND accepted_at IS NULL AND expires_at > NOW()
    `;

    const [row] = await sql`
      INSERT INTO invites (invite_type, token_hash, allowed_join_types, expires_at, invited_by_user_id)
      VALUES ('bootstrap_ceo', ${hash}, 'human', ${expires}, 'system')
      RETURNING id, expires_at
    `;
    
    console.log("SUCCESS");
    console.log("ID:", row.id);
    console.log("INVITE_URL: https://paperclip-dashboard.onrender.com/invite/" + token);
    console.log("EXPIRES:", row.expires_at);
  } catch(err) {
    console.error("ERROR:", err.message);
    // List tables for debugging
    try {
      const tables = await sql`SELECT tablename FROM pg_tables WHERE schemaname='public'`;
      console.log("TABLES:", tables.map(t => t.tablename).join(", "));
    } catch(e2) {
      console.error("TABLE LIST ERROR:", e2.message);
    }
  } finally {
    await sql.end();
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
