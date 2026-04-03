// Bootstrap CEO invite - runs on Render via job API
// Uses dynamic import and catches all errors with full output
import { createHash, randomBytes } from "node:crypto";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log("Starting bootstrap...");
console.log("CWD:", process.cwd());
console.log("__dirname:", __dirname);
console.log("DATABASE_URL set:", !!process.env.DATABASE_URL);
console.log("DATABASE_URL prefix:", (process.env.DATABASE_URL || "").substring(0, 30) + "...");

try {
  console.log("Importing postgres...");
  const pg = await import("postgres");
  const postgres = pg.default;
  console.log("postgres imported OK");
  
  const sql = postgres(process.env.DATABASE_URL);
  const token = `pcp_bootstrap_${randomBytes(24).toString("hex")}`;
  const hash = createHash("sha256").update(token).digest("hex");
  const expires = new Date(Date.now() + 72 * 3600000);

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
  await sql.end();
} catch(err) {
  console.error("FATAL ERROR:", err.message);
  console.error("STACK:", err.stack);
  process.exit(1);
}

process.exit(0);
