// config/env.js
function requireEnv(name) {
  const v = process.env[name];
  if (!v || !String(v).trim()) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return String(v).trim();
}

function optionalEnv(name, fallback = null) {
  const v = process.env[name];
  if (!v || !String(v).trim()) return fallback;
  return String(v).trim();
}

function parseIntEnv(name, fallback) {
  const raw = optionalEnv(name, null);
  if (raw == null) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`Invalid env var ${name}: must be a positive number`);
  }
  return Math.floor(n);
}

function loadConfig() {
  return {
    port: parseIntEnv('AGENT_PORT', 8088),
    nodeEnv: optionalEnv('NODE_ENV', 'production'),

    // Security
    authToken: requireEnv('AGENT_AUTH_TOKEN'),

    // occtl runner defaults (used later)
    occtlPath: optionalEnv('OCCTL_PATH', '/usr/bin/occtl'),
    occtlTimeoutMs: parseIntEnv('OCCTL_TIMEOUT_MS', 5000),
  };
}

module.exports = {
  loadConfig,
};
