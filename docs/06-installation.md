

## 🛠️ `docs/06-installation.md`

````md
# RACP Ocserv Agent — Installation (v1)

**Agent Version:** 0.1.0  
**API Version:** v1  
**Installation Method:** Automated installer (`scripts/install.sh`)  
**Target System:** Linux with systemd (ocserv host)

---

## 1. Installation Philosophy (v1)

The RACP Ocserv Agent v1 provides a **single supported installation path**:

> **Automated installation via `scripts/install.sh`**

This ensures:
- consistent system user creation
- correct permissions
- correct sudoers rules
- correct systemd hardening
- correct runtime defaults

Manual installation is possible but **not recommended** for production.

---

## 2. Preconditions

Before installing, ensure:

### 2.1 Operating System
- Linux with **systemd**
- Root access (`sudo`)

### 2.2 Software
- **ocserv** installed and running
- **occtl** available (default path: `/usr/bin/occtl`)
- **Node.js ≥ 18**
- `npm`, `sudo`, `systemctl`, `visudo` available

Verify:

```bash
node -v
npm -v
which occtl
systemctl --version
````

---

## 3. Repository Placement

The installer assumes the repository is located at:

```
/opt/RACP-Ocserv-Agent
```

If cloning manually:

```bash
sudo mkdir -p /opt
cd /opt
sudo git clone <REPO_URL> RACP-Ocserv-Agent
```

---

## 4. Automated Installation (Recommended)

Run the installer as **root**:

```bash
cd /opt/RACP-Ocserv-Agent
sudo bash scripts/install.sh
```

---

## 5. What the Installer Does (Exactly)

The installer performs the following steps **idempotently**:

### 5.1 System User

* Creates system user:

  ```
  ocservagent
  ```
* No login shell
* No home directory

---

### 5.2 Directories

Creates and secures:

* Install directory:

  ```
  /opt/RACP-Ocserv-Agent
  ```
* Persistent data directory:

  ```
  /var/lib/ocserv-agent
  ```

Permissions:

* `/var/lib/ocserv-agent` → `700`, owned by `ocservagent`

This directory stores the **persistent instanceId**.

---

### 5.3 Node.js Dependencies

Installs production dependencies:

* Uses `npm ci --omit=dev` if `package-lock.json` exists
* Falls back to `npm install --omit=dev` otherwise

---

### 5.4 Environment File

Creates (if missing):

```
/etc/ocserv-agent.env
```

With safe defaults:

```env
NODE_ENV=production
AGENT_PORT=8088

AGENT_AUTH_TOKEN_CURRENT=REPLACE_ME_STRONG_TOKEN
AGENT_AUTH_TOKEN_PREVIOUS=

OCCTL_PATH=/usr/bin/occtl
OCCTL_TIMEOUT_MS=5000
OCCTL_USE_SUDO=true
```

Permissions:

* Owner: `root`
* Mode: `600`

⚠️ **Mandatory Step**
You must edit this file and set a strong value for:

```
AGENT_AUTH_TOKEN_CURRENT
```

---

### 5.5 sudoers Configuration

Creates:

```
/etc/sudoers.d/ocserv-agent
```

Allowing **only** these commands:

* `occtl show status`
* `occtl show users`
* `occtl show sessions`
* `occtl disconnect id *`
* `occtl disconnect user *`

All commands are:

* non-interactive (`sudo -n`)
* passwordless
* scoped to `ocservagent`

The installer validates sudoers with:

```bash
visudo -c
```

---

### 5.6 RADIUS (radcli) Read Access

If `/etc/radcli` exists, the installer:

* creates group: `radcliread`
* adds `ocservagent` to that group
* sets:

  * `/etc/radcli` → `755`
  * `/etc/radcli/servers*` → `640`, group `radcliread`

This enables the `/ocserv/radius-config` endpoint.

---

### 5.7 systemd Service

Creates:

```
/etc/systemd/system/ocserv-agent.service
```

Key properties:

* Runs as `ocservagent`
* Loads env from `/etc/ocserv-agent.env`
* Working directory: `/opt/RACP-Ocserv-Agent`
* Restart policy: always
* Hardened filesystem
* **NoNewPrivileges=false** (required for sudo)

Then:

```bash
systemctl daemon-reload
systemctl enable --now ocserv-agent
```

---

## 6. Post-Installation Verification

### 6.1 Service Status

```bash
sudo systemctl status ocserv-agent --no-pager
```

---

### 6.2 Logs

```bash
sudo journalctl -u ocserv-agent -n 100 --no-pager
```

---

### 6.3 occtl Access (Critical)

```bash
sudo -u ocservagent sudo -n /usr/bin/occtl show status
sudo -u ocservagent sudo -n /usr/bin/occtl show users
```

Both must return exit code `0`.

---

### 6.4 Health Endpoint

From a trusted machine:

```bash
curl -s \
  -H "Authorization: Bearer <TOKEN>" \
  http://<SERVER_IP>:8088/ocserv/health | jq
```

Expected:

* `"ok": true`
* `"ocserv": { "ok": true }`
* stable `instanceId`

---

## 7. Firewall Configuration (Required)

The agent port **must not be public**.

Example using `ufw`:

```bash
sudo ufw allow from <BACKEND_IP> to any port 8088 proto tcp
sudo ufw deny 8088/tcp
```

---

## 8. Updating the Agent

```bash
cd /opt/RACP-Ocserv-Agent
sudo git pull
sudo npm ci --omit=dev
sudo systemctl restart ocserv-agent
```

---

## 9. Uninstallation (v1)

```bash
sudo systemctl stop ocserv-agent
sudo systemctl disable ocserv-agent

sudo rm -f /etc/systemd/system/ocserv-agent.service
sudo rm -f /etc/sudoers.d/ocserv-agent
sudo rm -rf /opt/RACP-Ocserv-Agent
sudo rm -rf /var/lib/ocserv-agent
sudo rm -f /etc/ocserv-agent.env

sudo userdel ocservagent
```

---

## 10. Next Section

Proceed to:

➡️ **`docs/07-operations.md`**

for runtime operations, health monitoring, log analysis,
token rotation, and common troubleshooting steps.

```
