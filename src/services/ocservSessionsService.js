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

module.exports = {
  loadOcservSessions,
  loadAuthenticatedSessions,
  isAuthenticatedSession,
};
