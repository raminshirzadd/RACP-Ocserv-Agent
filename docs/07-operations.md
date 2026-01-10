
## 🧭 `docs/07-operations.md`

````md
# RACP Ocserv Agent — Operations & Runbook (v1)

**Agent Version:** 0.1.0  
**API Version:** v1  
**Audience:** SRE / Ops / Backend Engineers  
**Scope:** Runtime operation, monitoring, troubleshooting, recovery

---

## 1. Operational Responsibilities

The Ocserv Agent is a **control-plane service**.  
Operational ownership includes:

- keeping the service running
- ensuring occtl access remains functional
- protecting the agent endpoint
- monitoring health & logs
- performing safe token rotation
- diagnosing session-control failures

---

## 2. Service Lifecycle

### 2.1 Start / Stop / Restart

```bash
sudo systemctl start ocserv-agent
sudo systemctl stop ocserv-agent
sudo systemctl restart ocserv-agent
````

### 2.2 Enable on Boot

```bash
sudo systemctl enable ocserv-agent
```

### 2.3 Status

```bash
sudo systemctl status ocserv-agent --no-pager
```

Key things to check:

* service is `active (running)`
* no rapid restart loop
* correct user: `ocservagent`

---

## 3. Health Monitoring

### 3.1 Primary Health Check

Endpoint:

```
GET /ocserv/health
```

Example:

```bash
curl -s \
  -H "Authorization: Bearer <TOKEN>" \
  http://<SERVER_IP>:8088/ocserv/health | jq
```

---

### 3.2 Health Interpretation

#### Healthy

```json
{
  "ok": true,
  "ocserv": { "ok": true }
}
```

Means:

* agent process is alive
* occtl executed successfully
* ocserv is reachable

---

#### Degraded (ocserv not ready)

```json
{
  "ok": true,
  "ocserv": {
    "ok": false,
    "errorCode": "OCCTL_FAILED"
  }
}
```

Means:

* agent is running
* occtl failed or timed out
* session control may not work

---

## 4. Log Operations

### 4.1 View Logs

```bash
sudo journalctl -u ocserv-agent -n 100 --no-pager
```

Follow logs live:

```bash
sudo journalctl -u ocserv-agent -f
```

---

### 4.2 Log Structure

Each error log includes:

* requestId
* error code
* HTTP status
* internal message

Example:

```
[ocserv-agent] error {
  requestId: "lq3x-9dks83",
  code: "OCCTL_FAILED",
  status: 503,
  message: "occtl permission error"
}
```

Use `requestId` to correlate API calls ↔ logs.

---

## 5. Session Operations

### 5.1 List Active Sessions

```bash
curl -s \
  -H "Authorization: Bearer <TOKEN>" \
  http://<SERVER_IP>:8088/ocserv/sessions | jq
```

Used to:

* verify live users
* retrieve `vpnSessionId`
* confirm parsing correctness

---

### 5.2 Disconnect a Single Session (Safe)

**Preferred method:** by ID

```bash
curl -X POST \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"vpnSessionId":4269}' \
  http://<SERVER_IP>:8088/ocserv/disconnect
```

---

### 5.3 Disconnect by Username (Guarded)

```bash
-d '{"username":"test4"}'
```

Rules:

* must resolve to **exactly one** session
* otherwise returns `409 MULTIPLE_SESSIONS`

This guard is intentional.

---

### 5.4 Disconnect All Sessions for User

```bash
curl -X POST \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"username":"test4"}' \
  http://<SERVER_IP>:8088/ocserv/disconnectAll
```

Notes:

* atomic inside ocserv
* recommended for forced logouts

---

## 6. Token Rotation (Zero Downtime)

### 6.1 Procedure

1. Generate a new strong token
2. Edit `/etc/ocserv-agent.env`

```env
AGENT_AUTH_TOKEN_PREVIOUS=<OLD>
AGENT_AUTH_TOKEN_CURRENT=<NEW>
```

3. Restart agent:

```bash
sudo systemctl restart ocserv-agent
```

4. Update backend to use `<NEW>`
5. After confirmation, remove PREVIOUS and restart again

---

### 6.2 Validation

```bash
curl -H "Authorization: Bearer <NEW>"  /ocserv/health
curl -H "Authorization: Bearer <OLD>"  /ocserv/health
```

Both must work during rotation window.

---

## 7. occtl Failure Runbook

### 7.1 Symptoms

* `/ocserv/health` → `ocserv.ok=false`
* API returns `OCCTL_FAILED`
* Session list empty or errors

---

### 7.2 Diagnostic Steps

1. Verify ocserv is running:

```bash
systemctl status ocserv
```

2. Test occtl manually:

```bash
occtl show status
occtl show users
```

3. Test occtl as agent user:

```bash
sudo -u ocservagent sudo -n /usr/bin/occtl show status
```

---

### 7.3 Common Causes

| Cause                | Fix                             |
| -------------------- | ------------------------------- |
| sudoers missing      | re-run installer or fix sudoers |
| wrong occtl path     | fix `OCCTL_PATH`                |
| NoNewPrivileges=true | must be false                   |
| ocserv stopped       | restart ocserv                  |
| occtl timeout        | increase `OCCTL_TIMEOUT_MS`     |

---

## 8. RADIUS Snapshot Operations

### 8.1 Purpose

Endpoint:

```
GET /ocserv/radius-config
```

Used for:

* backend correlation
* ops debugging
* NAS identity verification

---

### 8.2 Failure Diagnosis

If empty or missing servers:

```bash
sudo -u ocservagent cat /etc/radcli/servers
```

Fix:

* ensure `radcliread` group exists
* ensure file permissions are `640`
* ensure directory `/etc/radcli` is `755`

---

## 9. Capacity & Performance

v1 characteristics:

* synchronous occtl calls
* one request = one occtl process
* designed for **low QPS control-plane usage**

Operational guidance:

* do not expose publicly
* backend should cache results if polling
* avoid concurrent disconnect storms

---

## 10. Safe Restart Policy

It is safe to restart the agent:

* no in-memory session state
* no persistent sockets
* instanceId persists across restarts

```bash
sudo systemctl restart ocserv-agent
```

---

## 11. Known Limitations (v1)

* no rate limiting
* no mTLS
* no async occtl pooling
* no push events from ocserv
* no HA clustering

These are **explicit design boundaries** for v1.

---

## 12. Next Section

Proceed to:

➡️ **`docs/08-architecture.md`**

to document the **end-to-end architecture**, trust boundaries,
and how the agent fits into the full RACP system.

```


