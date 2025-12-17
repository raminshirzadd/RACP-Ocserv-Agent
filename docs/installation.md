<!-- docs/installation.md -->

# RACP Ocserv Agent — Installation & Operations

This document installs and runs **RACP-Ocserv-Agent** as a hardened **systemd** service on an ocserv host.

## What you get
Agent endpoints:
- `GET  /ocserv/health`
- `GET  /ocserv/sessions`
- `GET  /ocserv/session`
- `POST /ocserv/disconnect`
- `POST /ocserv/disconnectAll`
- `GET  /ocserv/radius-config`

## Preconditions
- ocserv is installed and running.
- `occtl` exists (default expected path: `/usr/bin/occtl`).
- Node.js + npm installed (recommended: Node 20+ LTS).
- You can allow agent port (default 8088) only from backend IP(s).

---

## Install (recommended: using install script)

### 1) Clone repo (or copy files onto server)
Default install location: `/opt/RACP-Ocserv-Agent`

### 2) Run the installer
```bash
cd /opt/RACP-Ocserv-Agent
sudo bash scripts/install.sh
The installer will:

create ocservagent system user

create /var/lib/ocserv-agent for persisted instanceId

install npm deps

configure sudoers for occtl

install systemd unit

start + enable the service

Configuration
/etc/ocserv-agent.env
Created by the installer if missing.

Required:

AGENT_AUTH_TOKEN_CURRENT

Optional:

AGENT_AUTH_TOKEN_PREVIOUS (token rotation)

AGENT_PORT (default 8088)

OCCTL_PATH (default /usr/bin/occtl)

OCCTL_TIMEOUT_MS (default 5000)

OCCTL_USE_SUDO (default true)

Secure it:

owned by root

chmod 600

Verify
Local
bash

sudo systemctl status ocserv-agent --no-pager
sudo journalctl -u ocserv-agent -n 100 --no-pager
sudo -u ocservagent sudo -n /usr/bin/occtl show status >/dev/null; echo $?
Remote (from backend/admin machine)
bash

curl -s -H "Authorization: Bearer <TOKEN_CURRENT>" \
  http://<SERVER_IP>:8088/ocserv/health | jq
Expected:

ok: true

ocserv.ok: true

agent.instanceId present and stable across restarts

Firewall (critical)
Allow agent port only from backend IP(s). Example with ufw:

bash

sudo ufw allow from <BACKEND_IP> to any port 8088 proto tcp
sudo ufw deny 8088/tcp
sudo ufw status
(Use your firewall system equivalent.)

Token Rotation (no downtime)
Choose new token NEW.

Update /etc/ocserv-agent.env:

AGENT_AUTH_TOKEN_PREVIOUS=<OLD>

AGENT_AUTH_TOKEN_CURRENT=<NEW>

Restart agent:

bash

sudo systemctl restart ocserv-agent
Update backend(s) to use NEW.

Remove PREVIOUS after rollout and restart again.

Upgrade
bash

cd /opt/RACP-Ocserv-Agent
sudo git pull
sudo npm ci --omit=dev
sudo systemctl restart ocserv-agent
sudo journalctl -u ocserv-agent -n 50 --no-pager
Troubleshooting
Health returns ocserv.ok=false with OCCTL_FAILED
Check sudoers:

bash

sudo -u ocservagent sudo -n /usr/bin/occtl show status
If it prompts for password or fails:

sudoers file missing/wrong path

NoNewPrivileges=true blocks sudo (must be false for this agent design)

occtl path differs from /usr/bin/occtl

Port conflict (EADDRINUSE)
bash

ss -ltnp | grep ':8088'
Change AGENT_PORT in /etc/ocserv-agent.env, restart service.

npm: command not found
Install Node.js/npm first (Node 20+ LTS recommended).