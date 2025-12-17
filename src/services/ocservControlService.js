// src/services/ocservControlService.js
const { runOcctl } = require('./occtlRunner');

function parseOkFromOcctl(stdout) {
  return {
    ok: true,
    raw: String(stdout || '').trim(),
  };
}

/**
 * Disconnect exactly one session by numeric ID.
 * Correct occtl syntax on your server:
 *   occtl disconnect id <ID>
 */
async function disconnectSessionById(config, vpnSessionId) {
  const idNum = Number(vpnSessionId);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    const err = new Error('Invalid vpnSessionId');
    err.code = 'BAD_REQUEST';
    throw err;
  }

  const res = await runOcctl(config, ['disconnect', 'id', String(idNum)]);
  return parseOkFromOcctl(res.stdout);
}

/**
 * Disconnect all sessions for a username (server-side).
 * Correct occtl syntax:
 *   occtl disconnect user <NAME>
 *
 * This is better than looping IDs, because ocserv handles it atomically.
 */
async function disconnectAllByUsername(config, username) {
  const u = String(username || '').trim();
  if (!u) {
    const err = new Error('Invalid username');
    err.code = 'BAD_REQUEST';
    throw err;
  }

  const res = await runOcctl(config, ['disconnect', 'user', u]);
  return parseOkFromOcctl(res.stdout);
}

module.exports = {
  disconnectSessionById,
  disconnectAllByUsername,
};
