// src/services/radiusConfigService.js
const fs = require('fs');

function readFileSafe(path) {
  try {
    if (!path) return null;
    if (!fs.existsSync(path)) return null;
    return fs.readFileSync(path, 'utf8');
  } catch (_) {
    return null;
  }
}

function parseRadiusclientConf(text) {
  if (!text) return {};

  const out = {};
  const lines = text.split('\n');

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;

    // format: key value
    const parts = line.split(/\s+/);
    const key = parts.shift();
    const value = parts.join(' ').trim();

    if (!key) continue;

    if (key === 'nas-identifier') out.nasIdentifier = value;
    if (key === 'authserver') out.authServer = value;
    if (key === 'acctserver') out.acctServer = value;
  }

  return out;
}

function parseServersFile(text) {
  if (!text) return [];

  const servers = [];
  const lines = text.split('\n');

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;

    // typical format: host[:port] secret
    const parts = line.split(/\s+/);
    if (parts.length < 2) continue;

    servers.push({
      host: parts[0],
      hasSecret: true,
    });
  }

  return servers;
}

async function loadRadiusIdentity(config) {
  const confPath = config.radiusclientConfPath;
  const serversPath = config.radiusServersPath;

  const confText = readFileSafe(confPath);
  const serversText = readFileSafe(serversPath);

  const conf = parseRadiusclientConf(confText);
  const servers = parseServersFile(serversText);

  return {
    ok: true,
    radius: {
      ...conf,
      radiusclientConfPath: confPath,
      serversFile: serversPath,
      servers,
    },
  };
}

module.exports = {
  loadRadiusIdentity,
};
