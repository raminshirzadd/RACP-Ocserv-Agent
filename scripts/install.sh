
---

## `scripts/install.sh`

```bash
#!/usr/bin/env bash
# scripts/install.sh

set -euo pipefail

APP_NAME="ocserv-agent"
SERVICE_USER="ocservagent"
INSTALL_DIR="/opt/RACP-Ocserv-Agent"
DATA_DIR="/var/lib/ocserv-agent"
ENV_FILE="/etc/ocserv-agent.env"
SUDOERS_FILE="/etc/sudoers.d/ocserv-agent"
SYSTEMD_UNIT="/etc/systemd/system/ocserv-agent.service"

DEFAULT_PORT="8088"
DEFAULT_OCCTL="/usr/bin/occtl"
DEFAULT_TIMEOUT="5000"

log()  { echo -e "[install] $*"; }
warn() { echo -e "[install][warn] $*" >&2; }
die()  { echo -e "[install][error] $*" >&2; exit 1; }

need_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    die "Run as root: sudo bash scripts/install.sh"
  fi
}

check_tools() {
  command -v node >/dev/null 2>&1 || die "node not found. Install Node.js (recommended Node 20+ LTS)."
  command -v npm  >/dev/null 2>&1 || die "npm not found. Install npm."
  command -v sudo >/dev/null 2>&1 || die "sudo not found."
}

ensure_user() {
  if id -u "${SERVICE_USER}" >/dev/null 2>&1; then
    log "User '${SERVICE_USER}' already exists."
  else
    log "Creating system user '${SERVICE_USER}'..."
    useradd --system --no-create-home --shell /usr/sbin/nologin "${SERVICE_USER}"
  fi
}

ensure_dirs() {
  log "Ensuring install dir: ${INSTALL_DIR}"
  mkdir -p "${INSTALL_DIR}"

  log "Ensuring data dir: ${DATA_DIR}"
  mkdir -p "${DATA_DIR}"
  chown -R "${SERVICE_USER}:${SERVICE_USER}" "${DATA_DIR}"
  chmod 700 "${DATA_DIR}"
}

install_deps() {
  if [[ ! -f "${INSTALL_DIR}/package.json" ]]; then
    die "package.json not found in ${INSTALL_DIR}. Put repo there first (git clone) or adjust INSTALL_DIR."
  fi

  log "Installing production dependencies (npm ci --omit=dev)..."
  pushd "${INSTALL_DIR}" >/dev/null
  if [[ -f package-lock.json ]]; then
    npm ci --omit=dev
  else
    warn "package-lock.json missing; using npm install --omit=dev"
    npm install --omit=dev
  fi
  popd >/dev/null
}

create_env_file_if_missing() {
  if [[ -f "${ENV_FILE}" ]]; then
    log "Env file exists: ${ENV_FILE} (not modifying)"
    return
  fi

  log "Creating env file: ${ENV_FILE}"
  cat > "${ENV_FILE}" <<EOF
NODE_ENV=production
AGENT_PORT=${DEFAULT_PORT}

# token rotation ready
AGENT_AUTH_TOKEN_CURRENT=REPLACE_ME_STRONG_TOKEN
AGENT_AUTH_TOKEN_PREVIOUS=

OCCTL_PATH=${DEFAULT_OCCTL}
OCCTL_TIMEOUT_MS=${DEFAULT_TIMEOUT}
OCCTL_USE_SUDO=true
EOF

  chown root:root "${ENV_FILE}"
  chmod 600 "${ENV_FILE}"

  warn "IMPORTANT: edit ${ENV_FILE} and set AGENT_AUTH_TOKEN_CURRENT to a strong secret."
}

configure_sudoers() {
  log "Configuring sudoers for occtl: ${SUDOERS_FILE}"
  cat > "${SUDOERS_FILE}" <<EOF
${SERVICE_USER} ALL=(root) NOPASSWD: ${DEFAULT_OCCTL}
EOF
  chmod 440 "${SUDOERS_FILE}"

  log "Validating sudoers syntax..."
  visudo -c >/dev/null

  log "Sanity-check: ${SERVICE_USER} can run occtl non-interactively..."
  sudo -u "${SERVICE_USER}" sudo -n "${DEFAULT_OCCTL}" show status >/dev/null
}

install_systemd_unit() {
  log "Installing systemd unit: ${SYSTEMD_UNIT}"
  cat > "${SYSTEMD_UNIT}" <<EOF
# ${SYSTEMD_UNIT}
[Unit]
Description=RACP Ocserv Agent
After=network.target ocserv.service
Wants=ocserv.service

[Service]
Type=simple
User=${SERVICE_USER}
Group=${SERVICE_USER}

EnvironmentFile=${ENV_FILE}
WorkingDirectory=${INSTALL_DIR}

ExecStart=/usr/bin/node src/server.js
Restart=always
RestartSec=3

# Hardening (safe defaults)
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=${DATA_DIR}

# IMPORTANT:
# Keep NoNewPrivileges OFF because we rely on sudo -n for occtl.
NoNewPrivileges=false

StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

  log "Reloading systemd..."
  systemctl daemon-reload

  log "Enabling + starting service..."
  systemctl enable --now "${APP_NAME}.service"
}

post_checks() {
  log "Service status:"
  systemctl status "${APP_NAME}.service" --no-pager || true

  log "Recent logs:"
  journalctl -u "${APP_NAME}.service" -n 30 --no-pager || true

  log "Done."
  echo
  echo "Next steps:"
  echo "1) Edit ${ENV_FILE} and set AGENT_AUTH_TOKEN_CURRENT (strong secret)"
  echo "2) Restart: sudo systemctl restart ${APP_NAME}"
  echo "3) Verify health:"
  echo "   curl -s -H \"Authorization: Bearer <TOKEN>\" http://<SERVER_IP>:${DEFAULT_PORT}/ocserv/health | jq"
  echo
  echo "Firewall reminder: allow port ${DEFAULT_PORT} only from backend IP(s)."
}

main() {
  need_root
  check_tools
  ensure_user
  ensure_dirs
  create_env_file_if_missing
  install_deps
  configure_sudoers
  install_systemd_unit
  post_checks
}

main "$@"
