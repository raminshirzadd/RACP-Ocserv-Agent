Below is **Step 10** — the **versioning, compatibility, and upgrade policy** for v1.
This is the **governance chapter** that makes the project safe to evolve.

---

## 🧩 `docs/09-versioning-and-compatibility.md`

```md
# RACP Ocserv Agent — Versioning & Compatibility (v1)

**Agent Version:** 0.1.0  
**API Version:** v1  
**Audience:** Maintainers, Backend Engineers, Release Managers  
**Scope:** Versioning rules, backward compatibility, upgrade strategy

---

## 1. Why Versioning Matters Here

The Ocserv Agent is a **control-plane component**:

- it can disconnect users
- it interacts with privileged system resources
- it is tightly integrated with backend orchestration

Therefore:
- breaking changes must be explicit
- compatibility guarantees must be documented
- upgrades must be predictable and safe

This document defines those rules.

---

## 2. Versioning Dimensions

There are **two distinct version dimensions**:

| Dimension | Example | Purpose |
|---------|--------|--------|
| **Agent Version** | `0.1.0` | Implementation & packaging |
| **API Version** | `v1` | HTTP contract & semantics |

These are **related but not identical**.

---

## 3. Agent Version (`package.json`)

### 3.1 Definition

The agent version is defined in:

```

package.json → version

````

Example:
```json
{
  "name": "racp-ocserv-agent",
  "version": "0.1.0"
}
````

This version represents:

* code changes
* bug fixes
* internal refactors
* operational behavior

---

### 3.2 SemVer Interpretation (Adjusted)

v1 uses **SemVer-inspired rules**, with practical constraints:

| Change Type                      | Version Change    |
| -------------------------------- | ----------------- |
| Bug fix, no API change           | PATCH             |
| New feature, backward compatible | MINOR             |
| Breaking API or behavior         | MAJOR (or API v2) |

Because API stability matters more than internal code,
**API versioning takes precedence over SemVer purity**.

---

## 4. API Version (`apiVersion`)

### 4.1 Definition

The API version is exposed via:

```
GET /ocserv/health → agent.apiVersion
```

Example:

```json
{
  "apiVersion": "v1"
}
```

This version defines:

* endpoint paths
* request/response schemas
* semantics & guarantees

---

### 4.2 v1 Scope

API v1 guarantees:

* endpoint paths under `/ocserv/*`
* request/response field names
* error codes and meanings
* session lookup semantics
* disconnect safety rules
* health response structure

As long as `apiVersion` remains `v1`,
these guarantees **must not be broken**.

---

## 5. Backward Compatibility Rules (v1)

### 5.1 Allowed Changes (Non-Breaking)

The following **do not break v1**:

* adding new fields to responses
* adding new endpoints
* adding new error codes (without changing existing ones)
* performance improvements
* internal refactors
* logging improvements
* documentation changes

---

### 5.2 Forbidden Changes (Breaking)

The following **require API v2**:

* removing fields
* renaming fields
* changing field types
* changing error semantics
* changing disconnect rules
* changing authentication mechanism
* changing default behavior in a way backend relies on

---

## 6. Upgrade Strategy (v1)

### 6.1 Safe Upgrade Procedure

A v1 → v1 upgrade must be:

* in-place
* restart-only
* no data migration
* no backend change required

Recommended procedure:

```bash
cd /opt/RACP-Ocserv-Agent
sudo git pull
sudo npm ci --omit=dev
sudo systemctl restart ocserv-agent
```

Then verify:

```bash
curl -H "Authorization: Bearer <TOKEN>" /ocserv/health
```

---

### 6.2 Instance Identity Stability

Upgrades must **not** delete:

```
/var/lib/ocserv-agent/instance-id
```

This ensures:

* backend continues to recognize the agent
* no false “new server” events occur

The installer and upgrade procedure respect this.

---

## 7. Backend Compatibility Contract

From the backend’s perspective:

* Agent API version is authoritative
* Agent version is informational
* Backend must:

  * verify `apiVersion`
  * reject incompatible versions
  * log agent version for diagnostics

Recommended backend logic:

```
if apiVersion !== expected:
    refuse to operate
```

---

## 8. Introducing API v2 (Future)

When API v2 is introduced:

* `/ocserv/*` remains v1
* v2 must be:

  * versioned explicitly (path or header)
  * documented separately
* v1 may be:

  * deprecated
  * supported for a defined period

Example future pattern:

```
/ocserv/v1/...
/ocserv/v2/...
```

or

```
X-API-Version: v2
```

---

## 9. Deprecation Policy

For v1:

* No silent breaking changes
* Deprecation must be:

  * documented
  * announced
  * time-bound

A deprecated feature must:

* continue working
* log warnings (optional)
* have a removal plan

---

## 10. Compatibility Checklist (Release Gate)

Before releasing a new agent version under API v1, maintainers must verify:

* `/ocserv/health` unchanged
* all existing endpoints still respond
* schemas are backward compatible
* error codes preserved
* disconnect safety rules preserved
* instanceId behavior unchanged

This checklist is mandatory.

---

## 11. Known v1 Constraints

These are **accepted limitations** of v1:

* single shared secret authentication
* no mTLS
* synchronous occtl execution
* no HA clustering
* no event streaming

Addressing these requires **API v2 or higher**.

---

## 12. Status of This Document

This document **locks in v1 behavior**.

Any change that violates it must:

* increment API version
* update this document
* be explicitly reviewed

---

## 13. End of v1 Bible

With this chapter, the **RACP Ocserv Agent v1 Technical Bible** is complete.

Covered sections:

1. Overview & Scope
2. Configuration
3. API
4. Session Model
5. Security
6. Installation
7. Operations
8. Architecture
9. Versioning & Compatibility

---

## 14. Next Phase

After approval, the next logical steps are:

* Improvement roadmap (v1.x)
* API v2 design (if needed)
* HA / scaling strategy
* Multi-protocol agent abstraction

These are **intentionally out of v1 scope**.

```

---

### ✅ Step 10 complete — v1 documentation set finished

You now have a **complete, professional, production-grade “project bible”** for the RACP Ocserv Agent v1.

When you’re ready, we can:
- review & approve the whole set
- generate a **README.md** from this bible
- design the **v1 improvement roadmap**
- or start **v2 architecture planning**

Just tell me the next move.
```
