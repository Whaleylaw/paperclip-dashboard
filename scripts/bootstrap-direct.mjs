import { createHash, randomBytes } from "node:crypto";
import pg from "pg";
const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function bootstrap() {
  const client = await pool.connect();
  try {
    // Create invite token
    const token = `pcp_bootstrap_${randomBytes(24).toString("hex")}`;
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

    // Revoke any existing bootstrap invites
    await client.query(
      `UPDATE invites SET revoked_at = NOW(), updated_at = NOW() 
       WHERE invite_type = 'bootstrap_ceo' AND revoked_at IS NULL AND accepted_at IS NULL AND expires_at > NOW()`
    );

    // Insert new bootstrap invite
    await client.query(
      `INSERT INTO invites (id, invite_type, token_hash, allowed_join_types, expires_at, invited_by_user_id, created_at, updated_at)
       VALUES (gen_random_uuid(), 'bootstrap_ceo', $1, 'human', $2, 'system', NOW(), NOW())`,
      [tokenHash, expiresAt]
    );

    const baseUrl = process.env.PAPERCLIP_PUBLIC_URL || "https://paperclip-dashboard.onrender.com";
    console.log(`INVITE_URL=${baseUrl}/invite/${token}`);
    console.log(`TOKEN=${token}`);
    console.log(`EXPIRES=${expiresAt.toISOString()}`);
  } finally {
    client.release();
    await pool.end();
  }
}

bootstrap().catch(e => { console.error(e); process.exit(1); });
