// src/services/ocservStatusService.js
const { runOcctlJson } = require('./occtlRunner');
const { normalizeServerStatus } = require('./occtlJsonNormalizers');

async function loadOcservStatus(config) {
  const obj = await runOcctlJson(config, ['--json', 'show', 'status'], { expect: 'object' });
  return normalizeServerStatus(obj);
}

module.exports = {
  loadOcservStatus,
};
