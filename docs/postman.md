<!-- docs/postman.md -->

# Postman Setup

Files:
- `postman/RACP-Ocserv-Agent.postman_collection.json`
- `postman/RACP-Ocserv-Agent.postman_environment.json`

## Import
1) Postman → Import → select collection JSON
2) Import environment JSON
3) Select the environment (top-right)

## Variables
- `baseUrl`: `http://<server>:8088`
- `token`: agent bearer token
- `username`: test username
- `vpnSessionId`: session id from `/ocserv/sessions`
