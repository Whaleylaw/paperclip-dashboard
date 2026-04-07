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

# Auto-bootstrap: if there's a user but no instance_admin, promote the first user
if [ -n "$DATABASE_URL" ]; then
    cat > /tmp/_bootstrap.mjs << 'BEOF'
import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL, { ssl: "prefer", max: 1 });
try {
  const admins = await sql`SELECT count(*)::int AS c FROM instance_user_roles WHERE role = 'instance_admin'`;
  if (admins[0].c === 0) {
    const users = await sql`SELECT id, email FROM "user" LIMIT 1`;
    if (users.length > 0) {
      await sql`INSERT INTO instance_user_roles (id, user_id, role, created_at, updated_at) VALUES (gen_random_uuid(), ${users[0].id}, 'instance_admin', NOW(), NOW()) ON CONFLICT DO NOTHING`;
      console.log("Auto-bootstrapped", users[0].email, "as instance_admin");
    }
  } else {
    console.log("Admin already exists, skipping bootstrap");
  }
} catch (e) { console.log("Bootstrap skip:", e.message); }
await sql.end();
BEOF
    cd /app && gosu node node /tmp/_bootstrap.mjs 2>&1 || true
fi

exec gosu node "$@"
