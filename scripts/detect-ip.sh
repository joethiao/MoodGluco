#!/usr/bin/env bash
# detect-ip.sh - Detects local WiFi IP and updates LAN-friendly env vars in .env

ENV_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/.env"

# Get local WiFi IP
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "")

if [[ -z "$LOCAL_IP" ]]; then
  echo "WARN: Could not detect local IP, keeping existing config"
  exit 0
fi

# Helper to upsert a key/value pair in .env
upsert_env() {
  local key="$1"
  local value="$2"
  if grep -q "^${key}=" "$ENV_FILE"; then
    sed -i '' "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
  else
    echo "${key}=${value}" >> "$ENV_FILE"
  fi
}

upsert_env "EXPO_PUBLIC_BACKEND_HOST" "$LOCAL_IP"
upsert_env "EXPO_PUBLIC_OLLAMA_ENDPOINT" "http://${LOCAL_IP}:11434"

echo "Backend host set to: ${LOCAL_IP}"
