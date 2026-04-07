#!/bin/sh
set -e

CONFIG_DIR="/paperclip/instances/default"
CONFIG_FILE="$CONFIG_DIR/config.json"

echo "=== Creating config directory ==="
mkdir -p "$CONFIG_DIR"

echo "=== Writing config.json ==="
cat > "$CONFIG_FILE" << 'JSON'
{
  "database": {
    "mode": "postgres",
    "connectionString": ""
  },
  "server": {
    "host": "0.0.0.0",
    "port": 3100,
    "deploymentMode": "authenticated",
    "deploymentExposure": "private"
  },
  "auth": {
    "baseUrlMode": "env"
  }
}
JSON

echo "Config written to $CONFIG_FILE"
cat "$CONFIG_FILE"

echo "=== Running bootstrap-ceo ==="
cd /app
npx paperclipai auth bootstrap-ceo --force --base-url https://agents.lawyerincorporated.com 2>&1 || true

echo "=== Trying direct DB bootstrap ==="
node scripts/bootstrap-admin.mjs 2>&1

echo "=== Done ==="
