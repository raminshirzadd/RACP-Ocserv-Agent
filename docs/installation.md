
# RACP Ocserv Agent — Installation & Operations

This document describes the **standard, supported procedure** to install and operate
**RACP-Ocserv-Agent** as a hardened **systemd service** on an **ocserv** host.

The agent exposes a secure REST API used by RACP Backend to:
- inspect live VPN sessions
- disconnect users
- verify RADIUS configuration
- perform health checks

---

## What You Get

The agent exposes the following endpoints:

- `GET  /ocserv/health`
- `GET  /ocserv/sessions`
- `GET  /ocserv/session`
- `POST /ocserv/disconnect`
- `POST /ocserv/disconnectAll`
- `GET  /ocserv/radius-config`

All endpoints require **Bearer token authentication**.

---

## Preconditions

Before installing the agent, ensure:

- **ocserv** is installed and running.
- **occtl** is available (default path: `/usr/bin/occtl`).
- **Node.js + npm** installed  
  (recommended: **Node.js 20+ LTS**).
- TCP port **8088** (or chosen port) is reachable **only from backend IPs**.
- You have root access to configure system users, sudoers, and systemd.

---

## Installation (Recommended Path)

### 1) Create system user

```bash
sudo useradd --system --no-create-home --shell /usr/sbin/nologin ocservagent || true
````

---

### 2) Create required directories

```bash
sudo mkdir -p /opt/RACP-Ocserv-Agent
sudo mkdir -p /var/lib/ocserv-agent

sudo chown ocservagent:ocservagent /var/lib/ocserv-agent
sudo chmod 700 /var/lib/ocserv-agent
```

`/var/lib/ocserv-agent` stores the persisted `instanceId`
(required for backend trust validation).

---

### 3) Deploy the agent code

```bash
cd /opt
sudo git clone https://github.com/<YOUR_ORG>/RACP-Ocserv-Agent.git
cd /opt/RACP-Ocserv-Agent
sudo npm ci --omit=dev
```

---

### 4) Environment configuration

Create `/etc/ocserv-agent.env`:

```bash
sudo tee /etc/ocserv-agent.env >/dev/null <<'EOF'
NODE_ENV=production
AGENT_PORT=8088

# Authentication (required)
AGENT_AUTH_TOKEN_CURRENT=REPLACE_WITH_STRONG_TOKEN
AGENT_AUTH_TOKEN_PREVIOUS=

# occtl execution
OCCTL_PATH=/usr/bin/occtl
OCCTL_TIMEOUT_MS=5000
OCCTL_USE_SUDO=true
EOF
```

Secure it:

```bash
sudo chown root:root /etc/ocserv-agent.env
sudo chmod 600 /etc/ocserv-agent.env
```

---

### 5) Configure sudoers (critical)

The agent runs as an unprivileged user and **executes occtl via sudo**.

Create `/etc/sudoers.d/ocserv-agent`:

```bash
sudo tee /etc/sudoers.d/ocserv-agent >/dev/null <<'EOF'
Defaults:ocservagent !requiretty

ocservagent ALL=(root) NOPASSWD: /usr/bin/occtl show status
ocservagent ALL=(root) NOPASSWD: /usr/bin/occtl show users
ocservagent ALL=(root) NOPASSWD: /usr/bin/occtl show sessions
ocservagent ALL=(root) NOPASSWD: /usr/bin/occtl disconnect id *
ocservagent ALL=(root) NOPASSWD: /usr/bin/occtl disconnect user *
EOF

sudo chmod 440 /etc/sudoers.d/ocserv-agent
sudo visudo -c
```

**Sanity check (must return `0`):**

```bash
sudo -u ocservagent sudo -n /usr/bin/occtl show status >/dev/null; echo $?
sudo -u ocservagent sudo -n /usr/bin/occtl show users  >/dev/null; echo $?
```

If this fails, `/ocserv/health` will report `OCCTL_FAILED`.

---

### 6) Allow agent to read radcli configuration (required)

The agent must read `/etc/radcli/servers` for `/ocserv/radius-config`.

```bash
sudo groupadd -f radcliread
sudo usermod -aG radcliread ocservagent

sudo chgrp radcliread /etc/radcli/servers /etc/radcli/servers-tls
sudo chmod 640 /etc/radcli/servers /etc/radcli/servers-tls
sudo chmod 755 /etc/radcli
```

Validate:

```bash
sudo -u ocservagent cat /etc/radcli/servers
```

---

### 7) systemd service unit

Create `/etc/systemd/system/ocserv-agent.service`:

```ini
[Unit]
Description=RACP Ocserv Agent
After=network.target ocserv.service
Wants=ocserv.service

[Service]
Type=simple
User=ocservagent
Group=ocservagent

EnvironmentFile=/etc/ocserv-agent.env
WorkingDirectory=/opt/RACP-Ocserv-Agent
ExecStart=/usr/bin/node src/server.js

Restart=always
RestartSec=3

# Security hardening
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/ocserv-agent
ReadOnlyPaths=/etc/radcli

# IMPORTANT:
# Must remain false because sudo is required for occtl
NoNewPrivileges=false

StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now ocserv-agent
```

---

## Verification

### Local

```bash
sudo systemctl status ocserv-agent --no-pager
sudo journalctl -u ocserv-agent -n 100 --no-pager
```

### Remote (from backend/admin host)

```bash
curl -s -H "Authorization: Bearer <TOKEN>" \
  http://<SERVER_IP>:8088/ocserv/health | jq
```

Expected:

* `"ok": true`
* `"ocserv": { "ok": true }`
* `agent.instanceId` present and stable across restarts

---

## Firewall (Critical)

Allow access **only from backend IPs**.

Example (ufw):

```bash
sudo ufw allow from <BACKEND_IP> to any port 8088 proto tcp
sudo ufw deny 8088/tcp
sudo ufw status
```

---

## Token Rotation (No Downtime)

1. Choose a new token `NEW`.
2. Update `/etc/ocserv-agent.env`:

```env
AGENT_AUTH_TOKEN_PREVIOUS=<OLD>
AGENT_AUTH_TOKEN_CURRENT=<NEW>
```

3. Restart agent:

```bash
sudo systemctl restart ocserv-agent
```

4. Update backend(s) to use `NEW`.
5. Remove `PREVIOUS` later and restart again.

---

## Upgrade Procedure

```bash
cd /opt/RACP-Ocserv-Agent
sudo git pull
sudo npm ci --omit=dev
sudo systemctl restart ocserv-agent
sudo journalctl -u ocserv-agent -n 50 --no-pager
```

---

## Troubleshooting

### `ocserv.ok=false` / `OCCTL_FAILED`

```bash
sudo -u ocservagent sudo -n /usr/bin/occtl show status
```

If it fails:

* sudoers not applied correctly
* wrong occtl path
* `NoNewPrivileges=true` (must be false)
* ocserv not running

---

### Permission denied reading radcli

```bash
sudo -u ocservagent cat /etc/radcli/servers
```

Fix with the **radcliread** group steps above.

---

### Port conflict (`EADDRINUSE`)

```bash
ss -ltnp | grep ':8088'
```

Change `AGENT_PORT` and restart service.

---

### `npm: command not found`

Install Node.js 20+ LTS first.

---

## Status

This installation procedure is **Phase 5 complete**, production-ready,
and validated against real ocserv hosts.
