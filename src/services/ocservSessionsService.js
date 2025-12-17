// src/services/ocservSessionsService.js
const { runOcctl } = require('./occtlRunner');
const { parseShowUsers } = require('./occtlParser');

function isAuthenticatedSession(s) {
  if (!s) return false;
  if (!s.username) return false;            // removes (none)
  if (s.status === 'pre-auth') return false;
  return true;
}

/**
 * Load all sessions from ocserv (raw), parsed.
 */
async function loadOcservSessions(config) {
  const res = await runOcctl(config, ['show', 'users']);
  return parseShowUsers(res.stdout);
}

/**
 * Load sessions but filtered to "authenticated only" (Option A).
 */
async function loadAuthenticatedSessions(config) {
  const sessions = await loadOcservSessions(config);
  return sessions.filter(isAuthenticatedSession);
}


// src/services/ocservSessionsService.js

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
