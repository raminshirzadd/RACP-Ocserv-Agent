// src/services/ocservReadiness.js
const { runOcctlJson } = require('./occtlRunner');

/**
 * Fast readiness check:
 * - uses occtl --json show status
 * - short timeout (override occtlTimeoutMs temporarily)
 * - NEVER throws (returns { ok:false, ... } on failures)
 */
async function checkOcservReady(config, { timeoutMs = 1500 } = {}) {
  try {
    const cfg = {
      ...config,
      occtlTimeoutMs: timeoutMs,
    };

    // Just ensure occtl works + JSON parses
    await runOcctlJson(cfg, ['--json', 'show', 'status'], { expect: 'object' });

    return { ok: true };
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
