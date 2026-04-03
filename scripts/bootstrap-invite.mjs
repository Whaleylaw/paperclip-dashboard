import { createHash, randomBytes } from "node:crypto";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL);
const token = `pcp_bootstrap_${randomBytes(24).toString("hex")}`;
const hash = createHash("sha256").update(token).digest("hex");
const expires = new Date(Date.now() + 72 * 3600000);

const [row] = await sql`
  INSERT INTO invites (invite_type, token_hash, allowed_join_types, expires_at, invited_by_user_id)
  VALUES ('bootstrap_ceo', ${hash}, 'human', ${expires}, 'system')
  RETURNING id
`;
console.log("ID:", row.id);
console.log("INVITE_URL: https://paperclip-dashboard.onrender.com/invite/" + token);
await sql.end();
process.exit(0);
