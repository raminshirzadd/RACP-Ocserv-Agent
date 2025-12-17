
# RACP Ocserv Agent (RACP-Ocserv-Agent) — Installation Runbook (Phase 5)

## Scope

Installs and runs **RACP-Ocserv-Agent** as a systemd service on an ocserv host.

Agent provides:

* `GET /ocserv/health`
* `GET /ocserv/sessions`
* `GET /ocserv/session`
* `POST /ocserv/disconnect`
* `POST /ocserv/disconnectAll`
* `GET /ocserv/radius-config`

## Preconditions

* ocserv is installed and running.
* `occtl` exists at `/usr/bin/occtl` (or you know the real path).
* Port chosen for agent (default **8088**) is reachable **only from backend IPs**.
* Node.js is installed (recommend Node 20+ LTS).

  * If `npm: command not found`, install Node first.

---

## 1) Create service user

```bash
sudo useradd --system --no-create-home --shell /usr/sbin/nologin ocservagent || true
```

---

## 2) Create directories

```bash
sudo mkdir -p /opt/RACP-Ocserv-Agent
sudo mkdir -p /var/lib/ocserv-agent
sudo chown -R ocservagent:ocservagent /var/lib/ocserv-agent
sudo chmod 700 /var/lib/ocserv-agent
```

`/var/lib/ocserv-agent` is required for the persisted `instanceId`.

---

## 3) Deploy the agent code

### Option A: Git pull (recommended)

```bash
cd /opt
sudo git clone https://github.com/<YOU>/RACP-Ocserv-Agent.git
sudo chown -R root:root /opt/RACP-Ocserv-Agent
cd /opt/RACP-Ocserv-Agent
```

### Install dependencies

```bash
sudo npm ci --omit=dev
```

(Use `npm install` if you don’t have a lock file. Prefer `npm ci`.)

---

## 4) Create env file

Create `/etc/ocserv-agent.env`:

```bash
sudo tee /etc/ocserv-agent.env >/dev/null <<'EOF'
NODE_ENV=production
AGENT_PORT=8088

# token rotation ready
AGENT_AUTH_TOKEN_CURRENT=REPLACE_ME_STRONG_TOKEN
AGENT_AUTH_TOKEN_PREVIOUS=

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

## 5) Configure sudoers (occtl only, non-interactive)

Create `/etc/sudoers.d/ocserv-agent`:

```bash
sudo tee /etc/sudoers.d/ocserv-agent >/dev/null <<'EOF'
ocservagent ALL=(root) NOPASSWD: /usr/bin/occtl
EOF
sudo chmod 440 /etc/sudoers.d/ocserv-agent
```

Validate:

```bash
sudo visudo -c
```

Sanity check (must return exit code 0):

```bash
sudo -u ocservagent sudo -n /usr/bin/occtl show status >/dev/null; echo $?
```

If you get “a password is required”, sudoers is not applied correctly.

---

## 6) Create systemd service

Create `/etc/systemd/system/ocserv-agent.service`:

```ini
# /etc/systemd/system/ocserv-agent.service
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

# Hardening (safe defaults)
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/ocserv-agent

# IMPORTANT:
# Keep NoNewPrivileges OFF because we rely on sudo -n for occtl.
NoNewPrivileges=false

StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Enable + start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now ocserv-agent
```

Check logs:

```bash
sudo journalctl -u ocserv-agent -n 100 --no-pager
```

---

## 7) Firewall (critical)

Only allow backend IP(s) to reach agent port.

Example (firewalld):

```bash
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="<BACKEND_IP>/32" port protocol="tcp" port="8088" accept'
sudo firewall-cmd --permanent --add-port=8088/tcp --remove-port=8088/tcp 2>/dev/null || true
sudo firewall-cmd --reload
```

(If you use iptables/ufw, do equivalent.)

---

## 8) Verification (remote + local)

### Remote (from backend/admin machine)

```bash
curl -s -H "Authorization: Bearer <TOKEN_CURRENT>" http://<SERVER_IP>:8088/ocserv/health | jq
```

Expected:

* `"ok": true`
* `"ocserv": { "ok": true }`
* `agent.instanceId` exists and stays stable across restarts

### Local

```bash
sudo systemctl status ocserv-agent --no-pager
sudo -u ocservagent sudo -n /usr/bin/occtl show users
```

Restart test:

```bash
sudo systemctl restart ocserv-agent
curl -s -H "Authorization: Bearer <TOKEN_CURRENT>" http://<SERVER_IP>:8088/ocserv/health | jq
```

---

## 9) Token rotation procedure (no downtime)

1. Pick a new token `NEW`.
2. Update `/etc/ocserv-agent.env`:

   * `AGENT_AUTH_TOKEN_PREVIOUS=<OLD>`
   * `AGENT_AUTH_TOKEN_CURRENT=<NEW>`
3. Restart agent:

```bash
sudo systemctl restart ocserv-agent
```

4. Update backend(s) to use `NEW`.
5. After rollout, remove previous token and restart again.

---

## 10) Upgrade procedure

```bash
cd /opt/RACP-Ocserv-Agent
sudo git pull
sudo npm ci --omit=dev
sudo systemctl restart ocserv-agent
sudo journalctl -u ocserv-agent -n 50 --no-pager
```

---

## Common failures and fixes

### Health shows `ocserv.ok=false` with `OCCTL_FAILED`

* Confirm the service user can run occtl without password:

```bash
sudo -u ocservagent sudo -n /usr/bin/occtl show status
```

* If it fails:

  * sudoers path wrong (`/usr/bin/occtl` mismatch)
  * file permissions wrong (`chmod 440`)
  * `NoNewPrivileges=true` blocks sudo (must be false in this design)

### `npm: command not found`

Install Node.js/npm on the server (Node 20+ recommended).

### Port conflict (EADDRINUSE)

Something is already listening on 8088:

```bash
ss -ltnp | grep ':8088'
```

Change `AGENT_PORT` and restart service.

