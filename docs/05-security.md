## 🔐 `docs/05-security.md`

```md
# RACP Ocserv Agent — Security (v1)

**Agent Version:** 0.1.0  
**API Version:** v1  
**Source of Truth:**  
- `src/middleware/auth.js`  
- `src/services/occtlRunner.js`  
- `scripts/install.sh`  
- sudoers + systemd artifacts  
- `src/services/radiusConfigService.js`

---

## 1. Security Goals (v1)

The security model of v1 is designed to ensure:

1) The agent is **not publicly exposed**
2) Only trusted systems can call the agent (**Bearer auth**)
3) The agent runs as a **non-root system user**
4) The agent can only execute **strictly-scoped occtl commands**
5) The agent does not leak secrets (especially RADIUS secrets)
6) Failures are explicit and auditable (requestId + logs)

---

## 2. Authentication & Token Rotation

### 2.1 Bearer Authentication

All endpoints under `/ocserv/*` require:

```

Authorization: Bearer <token>

````

If missing or invalid:

- HTTP `401`
- JSON error:
  ```json
  {
    "ok": false,
    "error": {
      "code": "UNAUTHORIZED",
      "message": "Missing or invalid Authorization header",
      "requestId": "..."
    }
  }
````

---

### 2.2 Rotation Model

Accepted tokens:

* `AGENT_AUTH_TOKEN_CURRENT` (required)
* `AGENT_AUTH_TOKEN_PREVIOUS` (optional)

Meaning:

* During rotation, both tokens work.
* After rotation is complete, remove PREVIOUS and restart.

**Rotation steps (no downtime)**

1. Put OLD into `AGENT_AUTH_TOKEN_PREVIOUS`
2. Put NEW into `AGENT_AUTH_TOKEN_CURRENT`
3. Restart agent
4. Update backend to use NEW
5. Remove PREVIOUS later and restart again

---

### 2.3 Token Handling Notes

* Tokens are compared as exact strings.
* No hashing inside the agent (this is a runtime shared-secret model).
* Tokens must be:

  * long
  * random
  * never committed to git
* Store in `/etc/ocserv-agent.env` with permissions `600`.

---

## 3. Privilege Model

### 3.1 Runtime User (non-root)

Agent runs as:

* `User=ocservagent`
* `Group=ocservagent`

This is created by `scripts/install.sh`.

The agent does not require root privileges to run.

---

### 3.2 Why sudo Is Used (v1)

ocserv’s control interface (`occtl`) typically requires elevated privileges.
Therefore v1 runs occtl through:

```
sudo -n /usr/bin/occtl <args>
```

Where:

* `-n` means **non-interactive**
* prevents hanging waiting for a password
* keeps agent deterministic

This behavior is controlled by:

* `OCCTL_USE_SUDO` (default: true)
* `OCCTL_PATH` (default: /usr/bin/occtl)

---

## 4. Least-Privilege sudoers Design

### 4.1 Scope

The agent needs only these occtl commands:

* `occtl show status`
* `occtl show users`
* `occtl disconnect id *`
* `occtl disconnect user *`

Optional (included by installer):

* `occtl show sessions`

---

### 4.2 sudoers Example (installed by v1 installer)

File:

* `/etc/sudoers.d/ocserv-agent`

Contents (conceptually):

```
Defaults:ocservagent !requiretty

ocservagent ALL=(root) NOPASSWD: /usr/bin/occtl show status
ocservagent ALL=(root) NOPASSWD: /usr/bin/occtl show users
ocservagent ALL=(root) NOPASSWD: /usr/bin/occtl show sessions
ocservagent ALL=(root) NOPASSWD: /usr/bin/occtl disconnect id *
ocservagent ALL=(root) NOPASSWD: /usr/bin/occtl disconnect user *
```

### 4.3 Validation

The installer validates sudoers syntax:

```bash
visudo -c
```

And sanity-checks occtl runs:

```bash
sudo -u ocservagent sudo -n /usr/bin/occtl show status >/dev/null
sudo -u ocservagent sudo -n /usr/bin/occtl show users  >/dev/null
```

If these fail, the agent will return `OCCTL_FAILED`.

---

## 5. systemd Hardening Model

### 5.1 Hardening used (v1 installer)

The installer writes a systemd unit with:

* `PrivateTmp=true`
* `ProtectSystem=strict`
* `ProtectHome=true`
* `ReadWritePaths=/var/lib/ocserv-agent`
* `ReadOnlyPaths=/etc/radcli`
* `NoNewPrivileges=false`  ✅ (important)

### 5.2 Why `NoNewPrivileges=false` is required (v1)

Because v1 relies on `sudo -n` to execute occtl.

If `NoNewPrivileges=true`, many systems will block privilege escalation.
Result:

* occtl calls fail
* agent readiness returns `ok=false`
* requests may error with `OCCTL_FAILED`

**v1 requirement:**
If using sudo (`OCCTL_USE_SUDO=true`), keep:

```
NoNewPrivileges=false
```

---

## 6. Filesystem Access Controls

### 6.1 Persistent Identity Storage

Path:

* `/var/lib/ocserv-agent/instance-id`

Purpose:

* Store stable agent identity across restarts.

Permissions (v1 installer):

* directory: `700` owned by ocservagent
* file: `644` (written by agent)

---

### 6.2 RADIUS Snapshot Read Access

The agent reads:

* `RADIUSCLIENT_CONF_PATH` (default `/etc/radcli/radiusclient.conf`)
* `RADIUS_SERVERS_PATH` (default `/etc/radcli/servers`)

To allow safe read access:

* installer creates group `radcliread`
* adds `ocservagent` to this group
* sets group read on servers files (`640`)
* ensures `/etc/radcli` is searchable (`755`)

This enables `/ocserv/radius-config` to work without running agent as root.

---

## 7. Network Exposure Rules (Critical)

### 7.1 Threat Model

The agent is a control plane:

* it can disconnect sessions
* it reveals active usernames and IPs
* it exposes operational metadata

Therefore the agent port must be protected.

### 7.2 Firewall Rule (v1 requirement)

The agent port (default 8088) must be reachable **only from trusted backend/admin IPs**.

Example with `ufw`:

```bash
sudo ufw allow from <BACKEND_IP> to any port 8088 proto tcp
sudo ufw deny 8088/tcp
```

Equivalent iptables/nftables rules are acceptable.

---

## 8. Secret Handling & Data Minimization

### 8.1 RADIUS Secrets Are Not Exposed

`/ocserv/radius-config` parses `/etc/radcli/servers`.

It returns only:

* the host token (host or host:port)
* `hasSecret: true|false`

It never returns the secret value.

---

### 8.2 Logging

The error middleware logs server-side details including:

* requestId
* error code
* HTTP status
* internal error message

But it does not print tokens.

Operational guidance:

* do not log the Authorization header in proxies
* keep journald access restricted to admins

---

## 9. Security Troubleshooting Quick Checks

### 9.1 401 Unauthorized

Check:

* correct Authorization header used
* token matches env file
* service restarted after env change

---

### 9.2 ocserv health shows `ok=false` / `OCCTL_FAILED`

Check:

```bash
sudo -u ocservagent sudo -n /usr/bin/occtl show status
```

Then verify:

* sudoers file exists and correct
* `OCCTL_PATH` matches actual occtl location
* systemd has `NoNewPrivileges=false`
* ocserv is running

---

### 9.3 radius-config missing servers list

Check:

```bash
sudo -u ocservagent cat /etc/radcli/servers
```

Verify:

* `ocservagent` is in `radcliread` group
* file permissions are `640`
* directory permissions allow traversal (`/etc/radcli` is `755`)

---

## 10. Next Section

Proceed to:

➡️ **`docs/06-installation.md`**

to install the agent using the supported v1 method (`scripts/install.sh`)
and validate it with production-grade checks.

```

---

✅ Step 6 complete.

Say **“Generate Step 7”** and I’ll produce `docs/06-installation.md` next (based strictly on your `scripts/install.sh` + your real env + real occtl output).
```
