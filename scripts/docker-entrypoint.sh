#!/bin/sh
set -e

# Capture runtime UID/GID from environment variables, defaulting to 1000
PUID=${USER_UID:-1000}
PGID=${USER_GID:-1000}

# Adjust the node user's UID/GID if they differ from the runtime request
# and fix volume ownership only when a remap is needed
changed=0

if [ "$(id -u node)" -ne "$PUID" ]; then
    echo "Updating node UID to $PUID"
    usermod -o -u "$PUID" node
    changed=1
fi

if [ "$(id -g node)" -ne "$PGID" ]; then
    echo "Updating node GID to $PGID"
    groupmod -o -g "$PGID" node
    usermod -g "$PGID" node
    changed=1
fi

if [ "$changed" = "1" ]; then
    chown -R node:node /paperclip
fi

# Render.com: derive PAPERCLIP_PUBLIC_URL from the platform-provided
# RENDER_EXTERNAL_URL if the operator didn't set one explicitly. This makes
# the Render blueprint in render.yaml work out of the box on first deploy.
if [ -z "$PAPERCLIP_PUBLIC_URL" ] && [ -n "$RENDER_EXTERNAL_URL" ]; then
    echo "Setting PAPERCLIP_PUBLIC_URL=$RENDER_EXTERNAL_URL from RENDER_EXTERNAL_URL"
    export PAPERCLIP_PUBLIC_URL="$RENDER_EXTERNAL_URL"
fi

# Ensure the instance config directory exists on the persistent volume
INSTANCE_DIR="/paperclip/instances/default"
ENV_FILE="$INSTANCE_DIR/.env"
mkdir -p "$INSTANCE_DIR"

# Generate BETTER_AUTH_SECRET if not provided and not already persisted
if [ -z "$BETTER_AUTH_SECRET" ] && [ -z "$PAPERCLIP_AGENT_JWT_SECRET" ]; then
    if [ -f "$ENV_FILE" ] && grep -q '^BETTER_AUTH_SECRET=' "$ENV_FILE"; then
        echo "Loading persisted BETTER_AUTH_SECRET from $ENV_FILE"
    else
        echo "Generating BETTER_AUTH_SECRET and persisting to $ENV_FILE"
        SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
        echo "BETTER_AUTH_SECRET=$SECRET" >> "$ENV_FILE"
    fi
fi

chown -R node:node "$INSTANCE_DIR"

# Auto-bootstrap:
#   - if an instance_admin already exists, do nothing
#   - else if any user exists, promote the first user to instance_admin
#   - else if no pending bootstrap_ceo invite exists, mint one and print the
#     URL so the operator can click it straight out of the container logs
if [ -n "$DATABASE_URL" ]; then
    cat > /tmp/_bootstrap.mjs << 'BEOF'
import postgres from "postgres";
import crypto from "node:crypto";

const sql = postgres(process.env.DATABASE_URL, { ssl: "prefer", max: 1 });

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function createInviteToken() {
  return `pcp_bootstrap_${crypto.randomBytes(24).toString("hex")}`;
}

function banner(lines) {
  const bar = "=".repeat(70);
  console.log(bar);
  for (const line of lines) console.log(line);
  console.log(bar);
}

try {
  const admins = await sql`SELECT count(*)::int AS c FROM instance_user_roles WHERE role = 'instance_admin'`;
  if (admins[0].c > 0) {
    console.log("Admin already exists, skipping bootstrap");
  } else {
    const users = await sql`SELECT id, email FROM "user" LIMIT 1`;
    if (users.length > 0) {
      await sql`INSERT INTO instance_user_roles (id, user_id, role, created_at, updated_at) VALUES (gen_random_uuid(), ${users[0].id}, 'instance_admin', NOW(), NOW()) ON CONFLICT DO NOTHING`;
      console.log("Auto-bootstrapped", users[0].email, "as instance_admin");
    } else {
      const pending = await sql`
        SELECT count(*)::int AS c FROM invites
        WHERE invite_type = 'bootstrap_ceo'
          AND accepted_at IS NULL
          AND revoked_at IS NULL
          AND expires_at > NOW()
      `;
      if (pending[0].c > 0) {
        banner([
          "Paperclip first-run bootstrap",
          "A pending bootstrap invite already exists, but its token is not",
          "recoverable from the database. Check earlier container logs for",
          "the invite URL, or rotate it by running from a shell with access",
          "to DATABASE_URL:",
          "  pnpm paperclipai auth bootstrap-ceo --force",
        ]);
      } else {
        const token = createInviteToken();
        const tokenHash = hashToken(token);
        const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
        await sql`
          INSERT INTO invites (invite_type, token_hash, allowed_join_types, expires_at, invited_by_user_id)
          VALUES ('bootstrap_ceo', ${tokenHash}, 'human', ${expiresAt}, 'system')
        `;
        const baseUrl = (process.env.PAPERCLIP_PUBLIC_URL || `http://localhost:${process.env.PORT || 3100}`).replace(/\/+$/, "");
        banner([
          "Paperclip first-run bootstrap invite created",
          "",
          "Open this URL in your browser to create the first admin user:",
          `  ${baseUrl}/invite/${token}`,
          "",
          `Expires: ${expiresAt.toISOString()}`,
        ]);
      }
    }
  }
} catch (e) {
  console.log("Bootstrap skip:", e.message);
}
await sql.end();
BEOF
    cd /app && gosu node node /tmp/_bootstrap.mjs 2>&1 || true
fi

exec gosu node "$@"
