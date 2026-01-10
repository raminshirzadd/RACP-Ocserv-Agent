
## 🌐 `docs/03-api.md`

```md
# RACP Ocserv Agent — HTTP API (v1)

**Base Path:** `/ocserv`  
**API Version:** `v1`  
**Authentication:** Bearer token (required for all endpoints)

---

## 1. API Conventions

### 1.1 Authentication

All requests must include:

```

Authorization: Bearer <TOKEN>

```

Accepted tokens:
- `AGENT_AUTH_TOKEN_CURRENT` (required)
- `AGENT_AUTH_TOKEN_PREVIOUS` (optional, for rotation)

Requests without a valid token receive **401 Unauthorized**.

---

### 1.2 Request ID

- Every request receives a unique `requestId`
- Returned as HTTP header:
```

X-Request-Id: <id>

````
- Included in all error responses

This ID is used for log correlation and debugging.

---

### 1.3 Response Envelope

All responses follow this structure:

#### Success
```json
{
"ok": true,
"...": "payload"
}
````

#### Error

```json
{
  "ok": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "requestId": "..."
  }
}
```

---

### 1.4 Error Codes (common)

| Code              | Meaning                         |
| ----------------- | ------------------------------- |
| UNAUTHORIZED      | Missing or invalid bearer token |
| BAD_REQUEST       | Invalid or missing parameters   |
| MULTIPLE_SESSIONS | Username resolves to >1 session |
| OCCTL_FAILED      | occtl execution failed          |
| OCCTL_TIMEOUT     | occtl command timed out         |
| INTERNAL_ERROR    | Unexpected server error         |
| NOT_FOUND         | Invalid route                   |

---

## 2. Endpoints

---

## 2.1 Health & Handshake

### `GET /ocserv/health`

Returns agent identity, capabilities, and ocserv readiness.

#### Response `200 OK`

```json
{
  "ok": true,
  "agent": {
    "name": "racp-ocserv-agent",
    "version": "0.1.0",
    "apiVersion": "v1",
    "instanceId": "uuid",
    "hostname": "host.example",
    "startedAt": "2026-01-01T00:00:00.000Z",
    "persistedInstanceId": true
  },
  "ocserv": {
    "ok": true
  },
  "capabilities": {
    "listSessions": true,
    "disconnectSession": true,
    "disconnectAllForUser": true,
    "refreshSession": true
  }
}
```

#### Notes

* Readiness uses `occtl show status`
* Never throws; failures are reported as `ocserv.ok=false`

---

## 2.2 List Sessions

### `GET /ocserv/sessions`

Lists **authenticated VPN sessions only**.

#### Response `200 OK`

```json
{
  "ok": true,
  "sessions": [
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
  ],
  "count": 1
}
```

#### Notes

* Filters out `(none)` users
* Filters out `pre-auth` sessions
* Order is occtl-native (not sorted)

---

## 2.3 Get Single Session

### `GET /ocserv/session`

#### Query Parameters

At least **one** of the following is required:

| Name           | Type    |
| -------------- | ------- |
| `vpnSessionId` | integer |
| `username`     | string  |

#### Lookup Priority

1. `vpnSessionId` (if provided)
2. `username` (must be unique)

---

#### Response `200 OK`

```json
{
  "ok": true,
  "session": {
    "vpnSessionId": 4269,
    "username": "test4",
    "status": "connected"
  }
}
```

#### Username Conflict (`409`)

```json
{
  "ok": false,
  "error": {
    "code": "MULTIPLE_SESSIONS",
    "message": "Multiple active sessions found for username=test4. Use vpnSessionId.",
    "requestId": "..."
  },
  "matches": [
    {
      "vpnSessionId": 4269,
      "username": "test4",
      "ip": "172.16.24.163",
      "device": "vpns0",
      "status": "connected"
    }
  ]
}
```

---

## 2.4 Disconnect Single Session

### `POST /ocserv/disconnect`

#### Request Body

```json
{
  "vpnSessionId": 4269
}
```

OR

```json
{
  "username": "test4"
}
```

#### Rules

* `vpnSessionId` is preferred if provided
* `username` must resolve to **exactly one** session

---

#### Response `200 OK`

```json
{
  "ok": true,
  "disconnected": true,
  "vpnSessionId": 4269,
  "username": "test4"
}
```

#### Not Found (no-op)

```json
{
  "ok": true,
  "disconnected": false,
  "reason": "not_found"
}
```

---

## 2.5 Disconnect All Sessions for User

### `POST /ocserv/disconnectAll`

#### Request Body

```json
{
  "username": "test4"
}
```

#### Response `200 OK`

```json
{
  "ok": true,
  "username": "test4",
  "disconnectedCount": 2,
  "disconnectedSessionIds": [4269, 4270]
}
```

#### Notes

* Uses `occtl disconnect user <username>`
* ocserv performs atomic handling

---

## 2.6 RADIUS Client Identity Snapshot

### `GET /ocserv/radius-config`

Returns a **non-sensitive snapshot** of RADIUS client identity.

#### Response `200 OK`

```json
{
  "ok": true,
  "radius": {
    "nasIdentifier": "OCAnyConnect-OCNAS-UST",
    "authServer": "23.148.146.94",
    "acctServer": "23.148.146.94",
    "radiusclientConfPath": "/etc/radcli/radiusclient.conf",
    "serversFile": "/etc/radcli/servers",
    "servers": [
      { "host": "23.148.146.94", "hasSecret": true }
    ]
  }
}
```

#### Security Notes

* Secrets are **never returned**
* Intended for debugging and correlation only

---

## 3. HTTP Status Summary

| Status | Meaning                               |
| ------ | ------------------------------------- |
| 200    | Successful operation                  |
| 400    | Invalid or missing parameters         |
| 401    | Authentication failed                 |
| 409    | Username conflict (multiple sessions) |
| 500    | Internal error                        |
| 503    | occtl execution failure               |

---

## 4. API Stability Guarantees (v1)

For API v1:

* Endpoint paths are stable
* Field names are stable
* Error codes are stable
* Semantics of vpnSessionId vs username are stable

Breaking changes require a new API version.

---

## 5. Next Section

Proceed to:

➡️ **`docs/04-session-model.md`**

to understand the **exact session schema**, occtl parsing rules,
and field-by-field meanings.

```
