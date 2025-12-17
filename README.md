
# RACP Ocserv Agent

A lightweight control agent for **ocserv (OpenConnect VPN Server)** used by **RACP** to:
- list active VPN sessions
- disconnect sessions or users
- expose agent identity & readiness
- expose RADIUS client identity (debug/ops)

The agent communicates with ocserv via `occtl` and exposes a secured HTTP API for backend control.

---

## Features
- 🔐 Bearer token authentication (with token rotation)
- 🆔 Persistent agent identity (`instanceId`)
- 🔌 Session listing & control (disconnect / disconnectAll)
- 🩺 Health & readiness endpoint
- 📡 RADIUS client config snapshot
- ⚙️ Systemd-ready, hardened service

---

## API
- `GET  /ocserv/health`
- `GET  /ocserv/sessions`
- `GET  /ocserv/session`
- `POST /ocserv/disconnect`
- `POST /ocserv/disconnectAll`
- `GET  /ocserv/radius-config`

See:
- `docs/api.md`
- `docs/openapi.yaml`
- `postman/RACP-Ocserv-Agent.postman_collection.json`

---

## Installation
Recommended method:
```bash
sudo bash scripts/install.sh
````

Manual & detailed steps:

* `docs/installation.md`
* `docs/InstallationRunbook.md`

---

## Configuration

Main config file:

```bash
/etc/ocserv-agent.env
```

Required:

* `AGENT_AUTH_TOKEN_CURRENT`

Optional:

* `AGENT_AUTH_TOKEN_PREVIOUS`
* `AGENT_PORT` (default: 8088)
* `OCCTL_PATH`
* `OCCTL_TIMEOUT_MS`

---

## Smoke Test

```bash
TOKEN=your_token BASE_URL=http://SERVER_IP:8088 bash scripts/smoke-api.sh
```

---

## Security Notes

* Agent port should be accessible **only from backend IPs**
* Agent runs as non-root user with minimal sudo access
* `occtl` access is explicitly scoped via sudoers

---

## License

Internal RACP component.
