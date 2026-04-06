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

exec gosu node "$@"
