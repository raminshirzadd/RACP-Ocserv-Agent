
## 🏗️ `docs/08-architecture.md`

```md
# RACP Ocserv Agent — Architecture (v1)

**Agent Version:** 0.1.0  
**API Version:** v1  
**Audience:** Architects, Senior Engineers, Security Review  
**Scope:** System architecture, trust boundaries, data flow

---

## 1. Architectural Role of the Agent

The **RACP Ocserv Agent** is a **local control-plane bridge** between:

- **RACP Backend (remote, trusted)**
- **ocserv / occtl (local, privileged)**

It exists to solve a fundamental problem:

> ocserv exposes powerful control via `occtl`,  
> but `occtl` is **local-only, privileged, and not API-safe**.

The agent converts:
- local, privileged CLI control  
into
- remote, authenticated, audited HTTP operations

---

## 2. High-Level System Diagram (Logical)

```

┌──────────────────────┐
│      RACP Backend    │
│  (API / Orchestrator)│
└─────────┬────────────┘
│ HTTPS (Bearer)
▼
┌──────────────────────────┐
│   RACP Ocserv Agent      │
│  (Node.js, systemd)     │
│                          │
│  - Auth middleware       │
│  - Session parsing       │
│  - Control validation    │
│                          │
└─────────┬────────────────┘
│ sudo -n
▼
┌──────────────────────────┐
│         occtl            │
│  (local privileged CLI)  │
└─────────┬────────────────┘
│ UNIX socket / IPC
▼
┌──────────────────────────┐
│         ocserv           │
│  (VPN data plane)        │
└──────────────────────────┘

```

---

## 3. Trust Zones

### 3.1 Trust Zone A — Backend

- Fully trusted
- Authenticates users and business logic
- Holds billing, policies, plans
- Calls the agent as a **machine client**

**Threat model**:
- Must protect agent token
- Must not expose agent endpoint publicly

---

### 3.2 Trust Zone B — Ocserv Agent (This Project)

- Semi-trusted
- No business logic
- No billing logic
- No persistence (except instanceId)
- No public exposure

Responsibilities:
- validate requests
- enforce safety rules
- execute controlled system commands
- expose minimal operational data

---

### 3.3 Trust Zone C — Host OS

- Privileged
- Contains:
  - ocserv
  - occtl
  - radcli
- Protected by:
  - sudoers
  - filesystem permissions
  - systemd hardening
  - firewall rules

---

## 4. Authentication & Identity Flow

### 4.1 Backend → Agent

- Authentication via **Bearer token**
- Token is shared secret
- Token rotation supported

No user identity is passed — only **machine identity**.

---

### 4.2 Agent Identity

Each agent generates a **persistent instanceId**:

- Stored at:
```

/var/lib/ocserv-agent/instance-id

```
- Stable across restarts
- Included in `/ocserv/health`

Used by backend to:
- identify servers
- prevent spoofing
- correlate monitoring

---

## 5. Data Flow by Operation

### 5.1 Health Check

```

Backend → Agent → occtl show status
↓
ocserv

```

Returns:
- agent metadata
- ocserv readiness
- static capabilities

No state mutation.

---

### 5.2 Session Listing

```

Backend → Agent → occtl show users
↓
ocserv

```

Agent:
- parses raw CLI output
- filters pre-auth
- normalizes fields
- returns structured JSON

---

### 5.3 Disconnect (Single)

```

Backend → Agent
→ validation (ID or unique username)
→ occtl disconnect id <id>
→ ocserv

```

Agent enforces:
- uniqueness
- safe defaults
- no blind mass operations

---

### 5.4 Disconnect All (User)

```

Backend → Agent
→ occtl disconnect user <username>
→ ocserv

```

Agent:
- intentionally bypasses per-ID loops
- relies on ocserv atomic behavior

---

### 5.5 RADIUS Snapshot

```

Backend → Agent → read /etc/radcli/*

```

Agent:
- reads config files
- strips secrets
- returns identity metadata only

---

## 6. Safety & Guard Rails (Architectural)

### 6.1 Why the Agent Exists (Instead of Direct SSH)

Without the agent:
- backend would need SSH access
- would need root or sudo
- no API semantics
- no safety guards
- no request identity
- no audit trail

The agent provides:
- a narrow, audited API
- explicit allow-lists
- predictable failure modes

---

### 6.2 Why Username Disconnect Is Guarded

Disconnecting by username is **dangerous** if multiple sessions exist.

Architecture decision:
- allow username disconnect only if unique
- otherwise force caller to specify `vpnSessionId`
- mass disconnect requires explicit `disconnectAll`

This prevents accidental outages.

---

## 7. Failure Domains

### 7.1 Agent Down

Impact:
- backend cannot control ocserv
- **VPN traffic continues**
- no data-plane impact

This is acceptable.

---

### 7.2 ocserv Down

Impact:
- health endpoint reports degraded
- disconnect/list operations fail
- VPN service already degraded

Agent reflects reality; it does not mask failures.

---

### 7.3 Backend Down

Impact:
- agent idle
- VPN continues operating
- no control actions possible

---

## 8. Scalability Characteristics (v1)

v1 is intentionally **simple and synchronous**:

- 1 HTTP request → 1 occtl process
- No pooling
- No caching
- No async queues

This is acceptable because:
- control-plane QPS is low
- operations are human- or policy-driven

---

## 9. Non-Goals (Explicit)

v1 **does not** attempt to:

- manage ocserv configuration
- modify users or credentials
- push real-time events
- maintain session state
- act as an HA controller
- expose public APIs

These are **intentional exclusions**.

---

## 10. Extension Points (Future-Proofing)

The architecture intentionally allows:

- mTLS instead of bearer tokens
- push-based session events
- async job execution
- HA agent clusters
- additional protocol agents (WireGuard, IKEv2, etc.)
- unified “VPN Agent” abstraction

These are **future versions**, not v1 scope.

---

## 11. Architectural Invariants (v1)

The following **must remain true** for v1:

- Agent is local to ocserv
- occtl remains the source of truth
- No business logic in agent
- No direct DB access
- No public exposure
- All privileged actions are allow-listed

---

## 12. Next Section

Proceed to:

➡️ **`docs/09-versioning-and-compatibility.md`**

to define:
- API versioning rules
- backward compatibility guarantees
- upgrade strategy across v1 → v2
```

