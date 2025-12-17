<!-- docs/api.md -->

# RACP Ocserv Agent — API

Base URL:
- `http://<host>:<port>` (default port: 8088)

Auth:
- `Authorization: Bearer <token>`
- Supports token rotation:
  - current: `AGENT_AUTH_TOKEN_CURRENT`
  - previous: `AGENT_AUTH_TOKEN_PREVIOUS` (optional)

All responses include:
- `X-Request-Id` header
- JSON body with `ok: true|false`

## Error format
```json
{
  "ok": false,
  "error": {
    "code": "UNAUTHORIZED|BAD_REQUEST|OCCTL_FAILED|...",
    "message": "human readable message",
    "requestId": "..."
  }
}
Endpoints
GET /ocserv/health
Returns agent handshake + ocserv readiness.

200 example:

json

{
  "ok": true,
  "agent": {
    "name": "racp-ocserv-agent",
    "version": "0.1.0",
    "apiVersion": "v1",
    "instanceId": "uuid",
    "hostname": "ust-in.raway.net",
    "startedAt": "ISO",
    "persistedInstanceId": true
  },
  "ocserv": { "ok": true },
  "capabilities": {
    "listSessions": true,
    "disconnectSession": true,
    "disconnectAllForUser": true,
    "refreshSession": true
  }
}
GET /ocserv/sessions
Lists authenticated sessions (occtl show users parsed).

200 example:

json

{
  "ok": true,
  "sessions": [ { "...session fields..." } ],
  "count": 1
}
GET /ocserv/session
Query:

vpnSessionId OR username (required)

200 example:

json

{
  "ok": true,
  "session": { "...session..." }
}
POST /ocserv/disconnect
Body:

vpnSessionId OR username (required)
Rules:

if vpnSessionId provided: disconnect that ID

if username provided: must resolve to a single active session; otherwise returns conflict

200 example:

json

{
  "ok": true,
  "disconnected": true,
  "vpnSessionId": 123,
  "username": "test4"
}
POST /ocserv/disconnectAll
Body:

username (required)
Disconnects all sessions for a user.

200 example:

json

{
  "ok": true,
  "username": "test4",
  "disconnectedCount": 2,
  "disconnectedSessionIds": [123, 456]
}
GET /ocserv/radius-config
Returns important RADIUS client identity snapshot (debug / correlation).

200 example:

json

{
  "ok": true,
  "radius": {
    "nasIdentifier": "OCAnyConnect-OCNAS-UST",
    "authServer": "23.148.146.94",
    "acctServer": "23.148.146.94",
    "radiusclientConfPath": "/etc/radcli/radiusclient.conf",
    "serversFile": "/etc/radcli/servers",
    "servers": [{ "host": "23.148.146.94", "hasSecret": true }]
  }
}

