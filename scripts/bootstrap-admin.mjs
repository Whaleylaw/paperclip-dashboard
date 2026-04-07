// Direct admin bootstrap using postgres.js (bundled with Paperclip)
// Run: node scripts/bootstrap-admin.mjs

import { createHash, randomBytes } from "node:crypto";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { ssl: "prefer" });

try {
  // Find existing user
  const users = await sql`SELECT id, email, name FROM "user" LIMIT 5`;
  console.log("Users:", JSON.stringify(users));

  if (users.length === 0) {
    console.error("No users found");
    process.exit(1);
  }

  const user = users[0];
  console.log(`Bootstrapping ${user.email} as instance admin...`);

  // Grant instance_admin role
  await sql`
    INSERT INTO instance_user_roles (id, user_id, role, created_at, updated_at)
    VALUES (gen_random_uuid(), ${user.id}, 'instance_admin', NOW(), NOW())
    ON CONFLICT DO NOTHING
  `;
  console.log("SUCCESS: instance_admin role granted");

  // Create bootstrap invite
  const token = `pcp_bootstrap_${randomBytes(24).toString("hex")}`;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 72 * 3600000);

  await sql`
    INSERT INTO invites (id, invite_type, token_hash, allowed_join_types, expires_at, invited_by_user_id, created_at, updated_at)
    VALUES (gen_random_uuid(), 'bootstrap_ceo', ${tokenHash}, 'human', ${expiresAt}, 'system', NOW(), NOW())
  `;

  const baseUrl = process.env.PAPERCLIP_PUBLIC_URL || "https://agents.lawyerincorporated.com";
  console.log(`INVITE_URL: ${baseUrl}/invite/${token}`);
  console.log(`Expires: ${expiresAt.toISOString()}`);

  // Verify
  const roles = await sql`SELECT * FROM instance_user_roles`;
  console.log("Roles:", JSON.stringify(roles));

} catch (err) {
  console.error("Error:", err.message);
  process.exit(1);
} finally {
  await sql.end();
}
