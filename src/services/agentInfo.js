// src/services/agentInfo.js
const os = require('os');
const path = require('path');

// Read version from package.json safely
function getPackageVersion() {
  try {
    // server.js lives in src/, package.json is at repo root
    const pkgPath = path.join(__dirname, '../../package.json');
    // eslint-disable-next-line import/no-dynamic-require, global-require
    const pkg = require(pkgPath);
    return pkg?.version || '0.0.0';
  } catch (_) {
    return '0.0.0';
  }
}

function getHostname() {
  try {
    return os.hostname();
  } catch (_) {
    return null;
  }
}

function buildAgentInfo({ instanceId, startedAt }) {
  return {
    name: 'racp-ocserv-agent',
    version: getPackageVersion(),
    apiVersion: 'v1',
    instanceId: instanceId || null,
    hostname: getHostname(),
    startedAt: startedAt ? new Date(startedAt).toISOString() : new Date().toISOString(),
  };
}

module.exports = {
  buildAgentInfo,
  getPackageVersion,
};
