// src/services/ocservSessionsService.js
const { runOcctlJson } = require('./occtlRunner');
const { normalizeUserSession } = require('./occtlJsonNormalizers');

function isAuthenticatedSession(s) {
  if (!s) return false;
  if (!s.username) return false; // removes (none) or missing
  if (s.status === 'pre-auth') return false;
  return true;
}

/**
 * Load all sessions from ocserv using JSON (canonical).
 */
async function loadOcservSessions(config) {
  const rows = await runOcctlJson(config, ['--json', 'show', 'users'], { expect: 'array' });

  const sessions = [];
  for (const row of rows) {
    const s = normalizeUserSession(row);
    if (s) sessions.push(s);
  }
  return sessions;
}

/**
 * Load sessions but filtered to "authenticated only".
 */
async function loadAuthenticatedSessions(config) {
  const sessions = await loadOcservSessions(config);
  return sessions.filter(isAuthenticatedSession);
}

function findSessionById(sessions, vpnSessionId) {
  if (!vpnSessionId) return null;
  const idNum = Number(vpnSessionId);
  if (!Number.isFinite(idNum)) return null;

  return sessions.find((s) => Number(s.vpnSessionId) === idNum) || null;
}

function findUniqueSessionByUsername(sessions, username) {
  if (!username) return { session: null, conflict: false, matches: [] };

  const matches = sessions.filter((s) => s.username === username);
  if (matches.length === 1) {
    return { session: matches[0], conflict: false, matches };
  }
  if (matches.length > 1) {
    return { session: null, conflict: true, matches };
  }
  return { session: null, conflict: false, matches };
}

module.exports = {
  loadOcservSessions,
  loadAuthenticatedSessions,
  isAuthenticatedSession,
  findSessionById,
  findUniqueSessionByUsername,
};
