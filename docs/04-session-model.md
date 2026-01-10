
## 🧩 `docs/04-session-model.md`

```md
# RACP Ocserv Agent — Session Model (v1)

**Agent Version:** 0.1.0  
**API Version:** v1  
**Source of Truth:**  
- `src/services/occtlParser.js`  
- `src/services/ocservSessionsService.js`  
- `occtl show users` output (production)

---

## 1. What a “Session” Means (v1)

In v1, a **session** represents a single active VPN connection reported by ocserv.

The agent does **not** create or manage sessions.  
It **observes** and **controls** them using `occtl`.

A session exists if and only if it appears in:

```

occtl show users

````

---

## 2. Source Command

All session data originates from:

```bash
occtl show users
````

Example (real-world):

```
      id     user    vhost             ip         vpn-ip device   since    dtls-cipher    status
    4269    test4  default  1.145.231.112  172.16.24.163  vpns0 17m:15s      (no-dtls) connected
```

The agent treats this output as **authoritative**.

---

## 3. Parsing Strategy (Critical Design)

### 3.1 Why Parsing Is Non-Trivial

`occtl show users` output:

* Is space-separated
* Has **optional/missing columns**
* May omit `vpn-ip` or `device`
* Has variable spacing
* Has a stable **right-hand tail**

Because of this, parsing is done **from right to left**.

---

### 3.2 Stable Right-Hand Columns

The **last three columns are always present**:

| Position (from right) | Field         |
| --------------------- | ------------- |
| last                  | `status`      |
| last - 1              | `dtls-cipher` |
| last - 2              | `since`       |

Everything to the **left** is parsed opportunistically.

---

## 4. Session Object Schema (v1)

Each parsed session is normalized into the following object:

```json
{
  "vpnSessionId": 4269,
  "username": "test4",
  "groupname": "default",
  "clientIp": "1.145.231.112",
  "ip": "172.16.24.163",
  "device": "vpns0",
  "since": "17m:15s",
  "sinceSeconds": 1035,
  "dtls": false,
  "dtlsCipher": "(no-dtls)",
  "status": "connected",
  "rawLine": "4269 test4 default ..."
}
```

---

## 5. Field-by-Field Semantics

### 5.1 `vpnSessionId` (authoritative)

* **Type:** integer or null
* Parsed from the first column (`id`)
* Must be numeric to be considered valid
* Used as the **primary session identifier**

> All control operations prefer `vpnSessionId`.

---

### 5.2 `username`

* **Type:** string or null
* Parsed from `user` column
* `(none)` is normalized to `null`

Used for:

* display
* lookup (only if unique)

---

### 5.3 `groupname`

* **Type:** string or null
* Parsed from `vhost` column
* Represents ocserv group / profile context

---

### 5.4 `clientIp`

* **Type:** string or null
* Source IP of the VPN client
* Parsed from the `ip` column

---

### 5.5 `ip` (VPN IP)

* **Type:** string or null
* Parsed from `vpn-ip` column
* Represents the internal VPN-assigned IP

---

### 5.6 `device`

* **Type:** string or null
* Parsed from `device` column
* Often shows interface name (e.g. `vpns0`)

---

### 5.7 `since`

* **Type:** string or null
* Raw uptime string from occtl (e.g. `17m:15s`, `1h:02m:10s`)

---

### 5.8 `sinceSeconds`

* **Type:** integer or null
* Parsed duration in seconds
* Supports:

  * `Xm:Ys`
  * `Xh:Ym:Zs`
  * `Xh:Ym`

If parsing fails, value is `null`.

---

### 5.9 `dtls` and `dtlsCipher`

* `dtls`:

  * **Type:** boolean
  * `true` if DTLS is active
* `dtlsCipher`:

  * Raw cipher string or `(no-dtls)`

---

### 5.10 `status`

* **Type:** string or null
* Common values:

  * `connected`
  * `pre-auth`
  * others as reported by ocserv

---

### 5.11 `rawLine`

* **Type:** string
* Full unmodified row from occtl
* Included for debugging and diagnostics
* May be removed or hidden in future versions

---

## 6. Authenticated Session Filtering

The agent exposes **only authenticated sessions**.

A session is considered authenticated if:

* `username !== null`
* `status !== 'pre-auth'`

This filtering is applied by:

```
loadAuthenticatedSessions()
```

---

## 7. Session Lookup Rules

### 7.1 Lookup by ID

* Preferred method
* Exact numeric match
* Always safe and unambiguous

---

### 7.2 Lookup by Username

Allowed **only if unique**:

| Match Count | Behavior                  |
| ----------- | ------------------------- |
| 0           | session = null            |
| 1           | session returned          |
| >1          | **409 MULTIPLE_SESSIONS** |

This prevents accidental mass disconnects.

---

## 8. Control Implications

* `disconnect`:

  * uses `vpnSessionId` if provided
  * username only if unique
* `disconnectAll`:

  * intentionally bypasses ID logic
  * delegates atomic handling to ocserv

---

## 9. Stability Guarantees (v1)

For v1, the following are guaranteed:

* Field names and meanings
* vpnSessionId as authoritative key
* Filtering rules
* Conflict semantics

Changes to parsing rules or schema require:

* documentation update
* version review (v2 if breaking)

---

## 10. Next Section

Proceed to:

➡️ **`docs/05-security.md`**

to understand **authentication, sudo design, filesystem access, and firewall rules** in v1.

```

