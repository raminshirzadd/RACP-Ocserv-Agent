// src/services/instanceIdentity.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEFAULT_DIR = '/var/lib/ocserv-agent';
const DEFAULT_FILE = path.join(DEFAULT_DIR, 'instance-id');

function ensureDirExists(dirPath) {
  try {
    fs.mkdirSync(dirPath, { recursive: true, mode: 0o755 });
  } catch (err) {
    // If it already exists or we lack permissions, we handle later
    // but we don't want agent to crash here.
  }
}

function readInstanceId(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const v = fs.readFileSync(filePath, 'utf8').trim();
    return v || null;
  } catch (_) {
    return null;
  }
}

function writeInstanceId(filePath, instanceId) {
  try {
    fs.writeFileSync(filePath, `${instanceId}\n`, { mode: 0o644 });
    return true;
  } catch (_) {
    return false;
  }
}

function generateInstanceId() {
  // Node 18 supports randomUUID()
  if (crypto.randomUUID) return crypto.randomUUID();
  // fallback
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Get stable instanceId:
 *  - read from disk if present
 *  - else create and persist
 *  - if we cannot persist, still return an in-memory id (but mark it as volatile)
 */
function getOrCreateInstanceId() {
  ensureDirExists(DEFAULT_DIR);

  const existing = readInstanceId(DEFAULT_FILE);
  if (existing) {
    return {
      instanceId: existing,
      persisted: true,
      path: DEFAULT_FILE,
    };
  }

  const created = generateInstanceId();
  const saved = writeInstanceId(DEFAULT_FILE, created);

  return {
    instanceId: created,
    persisted: !!saved,
    path: DEFAULT_FILE,
  };
}

module.exports = {
  getOrCreateInstanceId,
};
