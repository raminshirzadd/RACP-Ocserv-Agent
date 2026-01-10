# RACP Ocserv Agent — Technical Bible (v1)

**Component:** RACP Ocserv Agent  
**Agent Version:** 0.1.0  
**API Version:** v1  
**Node.js:** >= 18  
**Status:** Production-ready (v1 frozen)

---

## 1. Purpose of This Document

This document is the **authoritative technical reference (“standard bible”)** for the
**RACP Ocserv Agent v1**.

It defines:

- what the agent **is**
- what the agent **does**
- what the agent **does NOT do**
- the **exact runtime, API, security, and operational contracts**
- installation and troubleshooting procedures
- version guarantees for v1

This document is intended to be **attached to the project** and treated as the
**single source of truth** for v1 behavior.

---

## 2. Audience

This bible is written for:

- Backend engineers integrating with the agent
- Infrastructure / DevOps engineers operating ocserv hosts
- Security reviewers auditing sudo, auth, and network exposure
- Future contributors extending the agent beyond v1

It assumes:
- familiarity with Linux systems
- basic understanding of ocserv and RADIUS
- basic Node.js operational knowledge

---

## 3. Scope (What This Covers)

### Included (v1)

- Agent architecture and trust boundaries
- Environment configuration contract
- HTTP API (health, sessions, disconnect)
- Session model and parsing logic
- occtl execution and safety guarantees
- Authentication and token rotation
- systemd deployment and sudoers design
- Operational playbooks and troubleshooting
- Development and test utilities

### Explicitly Excluded

The following are **out of scope for v1** and intentionally not implemented:

- Authentication or authorization logic for VPN users
- Billing, quotas, or plan enforcement
- Policy reconciliation or orchestration
- Automatic session termination rules
- Remote configuration of ocserv
- RADIUS server management
- Cross-host coordination or clustering

Any future behavior in these areas **must be treated as a new version or extension**.

---

## 4. Design Principles (v1)

The Ocserv Agent v1 follows these strict principles:

1. **Isolation**
   - ocserv is not modified or patched
   - the agent operates externally via `occtl`

2. **Read-first, act-second**
   - session inspection is primary
   - control actions are explicit and minimal

3. **Least privilege**
   - runs as non-root user
   - sudo access limited to specific occtl commands

4. **Failure safety**
   - agent failure must not affect ocserv runtime
   - readiness failures are reported, not fatal

5. **Deterministic behavior**
   - vpnSessionId is the authoritative session identifier
   - ambiguous user actions are rejected with conflict errors

---

## 5. Version Contract

This bible documents **API version `v1`**.

For v1, the following are guaranteed:

- Endpoint paths under `/ocserv/*`
- Authentication via Bearer tokens
- Session schema fields and meanings
- Error formats and HTTP status codes
- Environment variable names and defaults
- occtl command usage semantics

Breaking changes to any of the above **require a new API version**.

---

## 6. Document Structure

This bible is organized as follows:

1. **Architecture**
   - Process model, trust boundaries, failure modes

2. **Configuration**
   - Environment variables and defaults

3. **API Contract**
   - Endpoints, request/response formats, errors

4. **Session Model**
   - Parsed session fields and occtl mapping

5. **Security Model**
   - Authentication, sudo, firewall, secrets handling

6. **Installation**
   - Automated installer and manual procedures

7. **Operations**
   - systemd, logging, health checks, upgrades

8. **Development & Testing**
   - Local dev, test scripts, validation tools

9. **Versioning & Compatibility**
   - Guarantees and forward-compat rules

Each section builds on the previous and should be read in order for first-time users.

---

## 7. Source of Truth

This documentation is derived directly from:

- `src/server.js`
- `src/routes/ocserv.routes.js`
- `src/controllers/ocservController.js`
- `src/services/*`
- `config/env.js`
- `scripts/install.sh`
- systemd and sudoers artifacts
- real occtl output from production hosts

No behavior is documented that does not exist in code.

---

## 8. Change Control

Once v1 is frozen:

- Documentation updates that clarify behavior are allowed
- Behavior changes require:
  - code change
  - documentation update
  - version review (v1.x or v2)

---

## 9. Next Sections

Proceed to:

➡️ **`docs/01-architecture.md`**  
to understand how the agent fits into the ocserv ecosystem and how trust boundaries are enforced.
