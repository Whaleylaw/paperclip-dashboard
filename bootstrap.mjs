import { createHash, randomBytes } from "node:crypto";
import postgres from "postgres";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) { console.error("Set DATABASE_URL"); process.exit(1); }

const sql = postgres(DB_URL, { ssl: "require" });

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

const token = `pcp_bootstrap_${randomBytes(24).toString("hex")}`;
const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

try {
  // Revoke existing bootstrap invites
  await sql`
    UPDATE invites 
    SET revoked_at = NOW(), updated_at = NOW()
    WHERE invite_type = 'bootstrap_ceo' 
      AND revoked_at IS NULL 
      AND accepted_at IS NULL 
      AND expires_at > NOW()
  `;

  // Insert new bootstrap invite
  const [created] = await sql`
    INSERT INTO invites (invite_type, token_hash, allowed_join_types, expires_at, invited_by_user_id)
    VALUES ('bootstrap_ceo', ${hashToken(token)}, 'human', ${expiresAt}, 'system')
    RETURNING *
  `;

  const inviteUrl = `https://paperclip-dashboard.onrender.com/invite/${token}`;
  console.log("SUCCESS! Bootstrap CEO invite created.");
  console.log(`Invite URL: ${inviteUrl}`);
  console.log(`Expires: ${created.expires_at}`);
} catch (err) {
  console.error("Error:", err.message);
  // Try to see what tables exist
  try {
    const tables = await sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;
    console.log("Available tables:", tables.map(t => t.tablename).join(", "));
  } catch (e) {
    console.error("Couldn't list tables:", e.message);
  }
} finally {
  await sql.end();
}
