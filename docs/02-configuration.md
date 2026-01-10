
## ⚙️ `docs/02-configuration.md`

```md
# RACP Ocserv Agent — Configuration (v1)

**Agent Version:** 0.1.0  
**API Version:** v1  
**Source of Truth:** `config/env.js`

---

## 1. Configuration Model

The RACP Ocserv Agent is configured **exclusively via environment variables**.

At startup:

1. Environment variables are read by `config/env.js`
2. Values are validated and parsed
3. A normalized configuration object is injected into:
```

app.locals.config

````

If required variables are missing or invalid, **the agent fails fast and does not start**.

---

## 2. Required Environment Variables

### 2.1 `AGENT_AUTH_TOKEN_CURRENT` (required)

**Purpose**  
Primary Bearer token used to authenticate all `/ocserv/*` API requests.

**Behavior**
- Must be non-empty
- Leading/trailing whitespace is trimmed
- Missing or empty value causes startup failure

**Example**
```env
AGENT_AUTH_TOKEN_CURRENT=very-strong-random-secret
````

---

## 3. Optional Environment Variables (with Defaults)

### 3.1 Server Runtime

#### `AGENT_PORT`

* **Type:** positive integer
* **Default:** `8088`
* **Validation:** must be a positive number

**Purpose**
TCP port the agent listens on.

```env
AGENT_PORT=8088
```

---

#### `NODE_ENV`

* **Type:** string
* **Default:** `production`

**Purpose**
Exposed for runtime context only (no behavior branching in v1).

```env
NODE_ENV=production
```

---

### 3.2 Token Rotation

#### `AGENT_AUTH_TOKEN_PREVIOUS`

* **Type:** string or empty
* **Default:** `null`

**Purpose**
Allows seamless token rotation without downtime.

**Behavior**

* If set, both CURRENT and PREVIOUS tokens are accepted
* If unset, only CURRENT is accepted

```env
AGENT_AUTH_TOKEN_PREVIOUS=old-rotating-token
```

---

### 3.3 occtl Execution

These variables control how `occtl` is executed by the agent.

---

#### `OCCTL_PATH`

* **Type:** string (filesystem path)
* **Default:** `/usr/bin/occtl`

**Purpose**
Absolute path to the `occtl` binary.

```env
OCCTL_PATH=/usr/bin/occtl
```

---

#### `OCCTL_TIMEOUT_MS`

* **Type:** positive integer (milliseconds)
* **Default:** `5000`

**Purpose**
Maximum time allowed for any occtl command to run.

**Behavior**

* If exceeded, the process is force-killed
* Request fails with `OCCTL_TIMEOUT`

```env
OCCTL_TIMEOUT_MS=5000
```

---

#### `OCCTL_USE_SUDO`

* **Type:** boolean
* **Default:** `true`

**Purpose**
Controls whether occtl is executed via `sudo -n`.

**Accepted values**

* `true`, `1`, `yes`, `y`, `on`
* `false`, `0`, `no`, `n`, `off`

**Behavior**

* If `true` (default):

  ```
  sudo -n <occtl> <args>
  ```
* If `false`:

  ```
  <occtl> <args>
  ```

```env
OCCTL_USE_SUDO=true
```

⚠️ **Important**
If `OCCTL_USE_SUDO=true`, the systemd unit **must allow sudo execution**
and `NoNewPrivileges` must not block it.

---

### 3.4 RADIUS Identity Snapshot

These variables define where the agent reads RADIUS client identity data from.

---

#### `RADIUSCLIENT_CONF_PATH`

* **Type:** string (path)
* **Default:** `/etc/radcli/radiusclient.conf`

**Purpose**
Location of radcli client configuration file.

```env
RADIUSCLIENT_CONF_PATH=/etc/radcli/radiusclient.conf
```

---

#### `RADIUS_SERVERS_PATH`

* **Type:** string (path)
* **Default:** `/etc/radcli/servers`

**Purpose**
Location of radcli servers file listing RADIUS servers and secrets.

```env
RADIUS_SERVERS_PATH=/etc/radcli/servers
```

**Security Note**

* Secrets are **never returned**
* Only `{ host, hasSecret }` is exposed

---

## 4. Validation Rules Summary

| Variable                 | Validation          |
| ------------------------ | ------------------- |
| AGENT_AUTH_TOKEN_CURRENT | Required, non-empty |
| AGENT_PORT               | Positive integer    |
| OCCTL_TIMEOUT_MS         | Positive integer    |
| OCCTL_USE_SUDO           | Strict boolean      |
| Others                   | Trimmed strings     |

Any invalid value causes **startup failure** with a clear error message.

---

## 5. Example Production Configuration

```env
NODE_ENV=production
AGENT_PORT=8088

AGENT_AUTH_TOKEN_CURRENT=REPLACE_WITH_STRONG_TOKEN
AGENT_AUTH_TOKEN_PREVIOUS=

OCCTL_PATH=/usr/bin/occtl
OCCTL_TIMEOUT_MS=5000
OCCTL_USE_SUDO=true

RADIUSCLIENT_CONF_PATH=/etc/radcli/radiusclient.conf
RADIUS_SERVERS_PATH=/etc/radcli/servers
```

---

## 6. Configuration Scope & Immutability

* Configuration is **read once at startup**
* No dynamic reload in v1
* Changes require a service restart

```bash
sudo systemctl restart ocserv-agent
```

---

## 7. Common Configuration Errors

### Missing token

```
Error: Missing required env var: AGENT_AUTH_TOKEN_CURRENT
```

### Invalid port

```
Invalid env var AGENT_PORT: must be a positive number
```

### Invalid boolean

```
Invalid env var OCCTL_USE_SUDO: must be boolean
```

---

## 8. Next Section

Proceed to:

➡️ **`docs/03-api.md`**

to review the **complete HTTP API contract**, including endpoints,
request/response formats, and error semantics.

```
