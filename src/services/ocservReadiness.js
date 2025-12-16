// src/services/ocservReadiness.js
const { runOcctl } = require('./occtlRunner');

/**
 * Fast readiness check:
 * - uses occtl show status
 * - short timeout (override occtlTimeoutMs temporarily)
 * - NEVER throws (returns { ok:false, ... } on failures)
 */
async function checkOcservReady(config, { timeoutMs = 1500 } = {}) {
  try {
    const cfg = {
      ...config,
      occtlTimeoutMs: timeoutMs,
    };

    await runOcctl(cfg, ['show', 'status']);

    return {
      ok: true,
    };
  } catch (err) {
    return {
      ok: false,
      errorCode: err.code || 'OCCTL_FAILED',
      errorMessage: (err.message || '').slice(0, 160),
    };
  }
}

module.exports = {
  checkOcservReady,
};
