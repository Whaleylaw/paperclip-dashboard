// Direct admin bootstrap — makes the first user an instance admin
// Run: node scripts/bootstrap-admin.mjs

import { createHash, randomBytes } from "node:crypto";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL not set");
  process.exit(1);
}

// Use raw pg since drizzle setup is complex
import pg from "pg";
const { Client } = pg;

const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function main() {
  await client.connect();
  console.log("Connected to database");

  // Find the existing user
  const users = await client.query("SELECT id, email, name FROM \"user\" LIMIT 5");
  console.log("Users:", JSON.stringify(users.rows));
  
  if (users.rows.length === 0) {
    console.error("No users found. Sign up first.");
    process.exit(1);
  }

  const user = users.rows[0];
  console.log(`Making ${user.email} an instance admin...`);

  // Check if instance_user_roles table exists
  const tables = await client.query(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%role%'"
  );
  console.log("Role tables:", JSON.stringify(tables.rows));

  // Try to insert admin role
  try {
    await client.query(
      `INSERT INTO instance_user_roles (id, user_id, role, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, 'instance_admin', NOW(), NOW())
       ON CONFLICT DO NOTHING`,
      [user.id]
    );
    console.log("SUCCESS: instance_admin role granted");
  } catch (e) {
    console.error("Role insert error:", e.message);
    // Try alternative table name
    try {
      await client.query(
        `INSERT INTO "instanceUserRoles" (id, "userId", role, "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, 'instance_admin', NOW(), NOW())
         ON CONFLICT DO NOTHING`,
        [user.id]
      );
      console.log("SUCCESS: instance_admin role granted (camelCase table)");
    } catch (e2) {
      console.error("Alt insert error:", e2.message);
    }
  }

  // Create bootstrap invite token
  const token = `pcp_bootstrap_${randomBytes(24).toString("hex")}`;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

  try {
    await client.query(
      `INSERT INTO invites (id, invite_type, token_hash, allowed_join_types, expires_at, invited_by_user_id, created_at, updated_at)
       VALUES (gen_random_uuid(), 'bootstrap_ceo', $1, 'human', $2, 'system', NOW(), NOW())`,
      [tokenHash, expiresAt]
    );
    const baseUrl = process.env.PAPERCLIP_PUBLIC_URL || "https://agents.lawyerincorporated.com";
    console.log(`INVITE_URL: ${baseUrl}/invite/${token}`);
  } catch (e) {
    console.error("Invite insert error:", e.message);
    // Try camelCase
    try {
      await client.query(
        `INSERT INTO invites (id, "inviteType", "tokenHash", "allowedJoinTypes", "expiresAt", "invitedByUserId", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), 'bootstrap_ceo', $1, 'human', $2, 'system', NOW(), NOW())`,
        [tokenHash, expiresAt]
      );
      console.log(`INVITE_URL: https://agents.lawyerincorporated.com/invite/${token}`);
    } catch (e2) {
      console.error("Alt invite error:", e2.message);
    }
  }

  // Verify
  const roles = await client.query("SELECT * FROM instance_user_roles LIMIT 5");
  console.log("Roles after:", JSON.stringify(roles.rows));

  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
