

## 🧱 `docs/01-overview.md`

```md
# RACP Ocserv Agent — overview.md (v1)

**Agent Version:** 0.1.0  
**API Version:** v1

---

## 1. Architectural Goal

The RACP Ocserv Agent exists to provide a **minimal, safe control plane** for
**ocserv (OpenConnect VPN Server)** without modifying or embedding into ocserv itself.

The agent must:

- observe live VPN session state
- execute limited control actions on demand
- expose a stable, secured HTTP API
- remain operationally isolated from ocserv

The agent is **not** an orchestrator, policy engine, or billing component.

---

## 2. High-Level Topology

```

+------------------------+

| Backend / Ops Tool         |
| -------------------------- |
| HTTPS / REST Client        |
| +-----------+------------+ |

```
        |
        | HTTP (Bearer Auth)
        v
```

+------------------------+

| RACP Ocserv Agent          |
| -------------------------- |
| - Express HTTP API         |
| - Auth middleware          |
| - Session parser           |
| - occtl runner             |
| +-----------+------------+ |

```
        |
        | sudo -n occtl
        v
```

+------------------------+

| ocserv                     |
| -------------------------- |
| VPN daemon + sessions      |
| +------------------------+ |

```

Key observation:

- **ocserv does not know the agent exists**
- The agent is a **client of ocserv**, not a plugin

---

## 3. Process Model

### 3.1 Runtime Processes

On a typical host, the following processes exist:

- `ocserv` (root or service user)
- `ocserv-agent` (Node.js, non-root)
- `systemd` (service supervisor)

The agent runs as:

```

User:  ocservagent
Group: ocservagent

```

and never runs as root.

---

### 3.2 Startup Sequence

1. systemd starts `ocserv-agent.service`
2. Node.js executes `src/server.js`
3. Environment is loaded via `config/env.js`
4. Express app is initialized
5. Middleware chain is installed
6. HTTP server begins listening
7. First `/ocserv/health` request triggers:
   - instance identity resolution
   - ocserv readiness check

---

## 4. Trust Boundaries

The architecture is explicitly designed around **clear trust boundaries**.

### 4.1 External Clients → Agent

- Access via HTTP
- Protected by Bearer token
- No anonymous access
- No session cookies
- No CSRF concerns (API-only)

Trust assumption:
> Only trusted backend/admin systems know the token.

---

### 4.2 Agent → ocserv

- Communication via local command execution
- Uses `occtl` exclusively
- Executed with:
```

sudo -n /usr/bin/occtl <args>

```

Trust assumption:
> If `occtl` is compromised, ocserv is already compromised.

---

### 4.3 Agent → Operating System

- Agent has:
- read/write access to `/var/lib/ocserv-agent`
- read-only access to `/etc/radcli`
- All other filesystem access is restricted via systemd

Trust assumption:
> Agent compromise must not lead to full host compromise.

---

## 5. occtl Interaction Model

### 5.1 Read Operations

The agent performs read-only operations:

- `occtl show status`
- `occtl show users`

These commands are:

- parsed
- normalized
- filtered
- returned as structured JSON

Failures in these commands:
- do **not** crash the agent
- are surfaced via readiness or error responses

---

### 5.2 Control Operations

The agent performs **explicit control actions only when requested**:

- `occtl disconnect id <ID>`
- `occtl disconnect user <USERNAME>`

Important design rules:

- No background enforcement
- No automatic disconnects
- No looping over IDs for bulk disconnect
- ocserv handles atomicity internally

---

## 6. Session Identity Model

### 6.1 Authoritative Identifier

The authoritative session key is:

```

vpnSessionId (numeric)

````

Rationale:

- Stable for session lifetime
- Unambiguous
- Matches ocserv internal representation

---

### 6.2 Username-Based Actions

Username-based actions are allowed **only if unambiguous**.

Rules:

- 0 matches → no-op (`disconnected=false`)
- 1 match  → allowed
- >1 match → **409 MULTIPLE_SESSIONS**

This prevents accidental termination of unintended sessions.

---

## 7. Readiness vs Liveness

### 7.1 Liveness

If the agent process is running and listening on the port, it is *alive*.

systemd handles restarts.

---

### 7.2 Readiness

Readiness is defined as:

> “The agent can successfully execute `occtl show status` within a short timeout.”

Readiness check behavior:

- timeout default: **1500ms**
- never throws
- returns:
  ```json
  { "ok": true }
````

or

```json
{ "ok": false, "errorCode": "...", "errorMessage": "..." }
```

The agent remains operational even if ocserv is down.

---

## 8. Failure Modes & Isolation

### 8.1 ocserv Down

* `/ocserv/health` reports `ocserv.ok=false`
* API remains reachable
* No agent crash

---

### 8.2 occtl Permission Failure

Common causes:

* sudoers misconfiguration
* `NoNewPrivileges=true`
* wrong occtl path

Behavior:

* occtl runner returns `OCCTL_FAILED`
* error surfaced in API response
* agent continues running

---

### 8.3 Agent Failure

If the agent crashes:

* ocserv continues running normally
* systemd restarts the agent
* no VPN sessions are affected

---

## 9. What the Architecture Intentionally Avoids

The v1 architecture explicitly avoids:

* embedding into ocserv
* shared memory or sockets with ocserv
* direct manipulation of ocserv config files
* long-running background loops
* automatic policy enforcement

These are deferred to future versions or external systems.

---

## 10. Architectural Guarantees (v1)

For v1, the architecture guarantees:

* No ocserv code modification
* Deterministic session identity
* Explicit control only
* Failure-safe isolation
* Minimal and auditable privileges

---

## 11. Next Section

Proceed to:

➡️ **`docs/02-configuration.md`**

to understand the **exact environment variable contract**, defaults, and validation rules for v1.

```

