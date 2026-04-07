// Direct admin bootstrap — uses Paperclip's own drizzle DB
// This imports from the built server code which has postgres bundled
import { createHash, randomBytes } from "node:crypto";

// Use the server's own database connection
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL not set");
  process.exit(1);
}

// Dynamic import of postgres (ESM)
const postgres = (await import("postgres")).default;
const sql = postgres(DATABASE_URL, { ssl: "prefer", max: 1 });

try {
  console.log("Connected to database");

  // Find users
  const users = await sql`SELECT id, email, name FROM "user" LIMIT 5`;
  console.log("Users found:", users.length);
  users.forEach(u => console.log(`  - ${u.email} (${u.id})`));

  if (users.length === 0) {
    console.error("No users found. Sign up at the web UI first.");
    process.exit(1);
  }

  const user = users[0];
  console.log(`\nMaking ${user.email} instance admin...`);

  // Delete any existing local-board admin
  const deleted = await sql`
    DELETE FROM instance_user_roles WHERE user_id = 'local-board'
  `;
  console.log(`Removed local-board entries: ${deleted.count}`);

  // Check if user already has admin role
  const existing = await sql`
    SELECT id FROM instance_user_roles 
    WHERE user_id = ${user.id} AND role = 'instance_admin'
  `;

  if (existing.length > 0) {
    console.log("User already has instance_admin role");
  } else {
    await sql`
      INSERT INTO instance_user_roles (id, user_id, role, created_at, updated_at)
      VALUES (gen_random_uuid(), ${user.id}, 'instance_admin', NOW(), NOW())
    `;
    console.log("SUCCESS: instance_admin role granted");
  }

  // Verify
  const roles = await sql`SELECT user_id, role FROM instance_user_roles`;
  console.log("\nAll roles:", JSON.stringify(roles));

  console.log("\nBOOTSTRAP COMPLETE - restart the service or refresh the UI");
} catch (err) {
  console.error("Error:", err.message);
  console.error("Stack:", err.stack);
  process.exit(1);
} finally {
  await sql.end();
}
