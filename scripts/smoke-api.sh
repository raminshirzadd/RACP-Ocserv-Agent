#!/usr/bin/env bash
# scripts/smoke-api.sh

set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:8088}"
TOKEN="${TOKEN:-}"

if [[ -z "${TOKEN}" ]]; then
  echo "Usage: TOKEN=... BASE_URL=http://host:8088 bash scripts/smoke-api.sh"
  exit 1
fi

h() { echo; echo "==> $*"; }

h "health"
curl -s -H "Authorization: Bearer ${TOKEN}" "${BASE_URL}/ocserv/health" | jq

h "sessions"
curl -s -H "Authorization: Bearer ${TOKEN}" "${BASE_URL}/ocserv/sessions" | jq

h "radius-config"
curl -s -H "Authorization: Bearer ${TOKEN}" "${BASE_URL}/ocserv/radius-config" | jq

echo
echo "OK"
