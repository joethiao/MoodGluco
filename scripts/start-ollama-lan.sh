#!/usr/bin/env bash
# start-ollama-lan.sh - Start Ollama bound to the LAN so phones on Wi-Fi can reach it.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DETECT_IP_SCRIPT="$SCRIPT_DIR/detect-ip.sh"
ENV_FILE="$(cd "$SCRIPT_DIR/.." && pwd)/.env"

if [[ -x "$DETECT_IP_SCRIPT" ]]; then
  "$DETECT_IP_SCRIPT" >/dev/null 2>&1 || true
fi

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

HOST_IP="${EXPO_PUBLIC_BACKEND_HOST:-127.0.0.1}"
PORT="${OLLAMA_PORT:-11434}"

if ! command -v ollama >/dev/null 2>&1; then
  echo "ERROR: ollama command not found"
  exit 1
fi

echo "Starting Ollama on http://${HOST_IP}:${PORT} ..."
export OLLAMA_HOST="0.0.0.0:${PORT}"
ollama serve &
OLLAMA_PID=$!

echo "Waiting for Ollama health on localhost and LAN..."
for i in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:${PORT}/api/tags" >/dev/null 2>&1; then
    if curl -sf "http://${HOST_IP}:${PORT}/api/tags" >/dev/null 2>&1; then
      echo "OK Ollama reachable on localhost and http://${HOST_IP}:${PORT} (PID ${OLLAMA_PID})"
      wait "$OLLAMA_PID"
      exit 0
    fi
  fi
  sleep 1
done

echo "WARN Ollama did not become reachable. Check whether another Ollama process is already running or blocked by firewall."
wait "$OLLAMA_PID"
