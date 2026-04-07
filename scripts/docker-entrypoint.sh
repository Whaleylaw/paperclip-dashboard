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
# This runs BEFORE the server starts, using the server's own DB connection
if [ -n "$DATABASE_URL" ]; then
    pip3 install --quiet --break-system-packages psycopg2-binary 2>/dev/null || true
    python3 -c "
import os, sys
try:
    import psycopg2
except ImportError:
    sys.exit(0)
conn = psycopg2.connect(os.environ['DATABASE_URL'])
cur = conn.cursor()
cur.execute('SELECT count(*) FROM instance_user_roles WHERE role = %s', ('instance_admin',))
admin_count = cur.fetchone()[0]
if admin_count == 0:
    cur.execute('SELECT id, email FROM \"user\" LIMIT 1')
    row = cur.fetchone()
    if row:
        cur.execute('INSERT INTO instance_user_roles (id, user_id, role, created_at, updated_at) VALUES (gen_random_uuid(), %s, %s, NOW(), NOW()) ON CONFLICT DO NOTHING', (row[0], 'instance_admin'))
        conn.commit()
        print(f'Auto-bootstrapped {row[1]} as instance_admin')
conn.close()
" 2>/dev/null || true
fi

exec gosu node "$@"
