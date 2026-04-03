// Bootstrap CEO invite - runs inside Docker container before/alongside server
// Uses the internal DATABASE_URL which works within Render's network
import { createHash, randomBytes } from "node:crypto";

async function main() {
  const pg = await import("postgres");
  const postgres = pg.default;
  
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }
  
  console.log("Connecting to database...");
  const sql = postgres(dbUrl);
  const token = `pcp_bootstrap_${randomBytes(24).toString("hex")}`;
  const hash = createHash("sha256").update(token).digest("hex");
  const expires = new Date(Date.now() + 72 * 3600000);

  try {
    // Check if admin already exists
    const admins = await sql`SELECT COUNT(*) as count FROM instance_user_roles WHERE role = 'instance_admin'`;
    if (parseInt(admins[0].count) > 0) {
      console.log("Admin already exists, skipping bootstrap.");
      await sql.end();
      process.exit(0);
    }

    // Revoke existing bootstrap invites
    await sql`
      UPDATE invites SET revoked_at = NOW(), updated_at = NOW()
      WHERE invite_type = 'bootstrap_ceo' AND revoked_at IS NULL AND accepted_at IS NULL AND expires_at > NOW()
    `;

    // Insert new bootstrap invite
    const [row] = await sql`
      INSERT INTO invites (invite_type, token_hash, allowed_join_types, expires_at, invited_by_user_id)
      VALUES ('bootstrap_ceo', ${hash}, 'human', ${expires}, 'system')
      RETURNING id, expires_at
    `;
    
    const baseUrl = process.env.PAPERCLIP_PUBLIC_URL || "https://paperclip-dashboard.onrender.com";
    console.log("========================================");
    console.log("BOOTSTRAP CEO INVITE CREATED");
    console.log("========================================");
    console.log(`INVITE URL: ${baseUrl}/invite/${token}`);
    console.log(`EXPIRES: ${row.expires_at}`);
    console.log("========================================");
    
    await sql.end();
  } catch(err) {
    console.error("ERROR:", err.message);
    await sql.end();
    process.exit(1);
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
