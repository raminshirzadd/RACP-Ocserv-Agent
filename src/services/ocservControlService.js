// src/services/ocservControlService.js
const { runOcctl } = require('./occtlRunner');

function parseOkFromOcctl(stdout) {
  // occtl often prints nothing on success, so we treat "command completed"
  // as success if exit code is 0 (runner should throw if non-zero).
  return {
    ok: true,
    raw: String(stdout || '').trim(),
  };
}

/**
 * Disconnect exactly one session by id.
 * Uses: occtl disconnect session <id>
 */
async function disconnectSessionById(config, vpnSessionId) {
  const idNum = Number(vpnSessionId);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    const err = new Error('Invalid vpnSessionId');
    err.code = 'BAD_REQUEST';
    throw err;
  }

  const res = await runOcctl(config, ['disconnect', 'session', String(idNum)]);
  return parseOkFromOcctl(res.stdout);
}

module.exports = {
  disconnectSessionById,
};
