// src/controllers/ocserv.controller.js
const { getOrCreateInstanceId } = require('../services/instanceIdentity');
const { buildAgentInfo } = require('../services/agentInfo');
const { checkOcservReady } = require('../services/ocservReadiness');
const {
  loadAuthenticatedSessions,
  findSessionById,
  findUniqueSessionByUsername,
} = require('../services/ocservSessionsService');

const STARTED_AT = Date.now();

// Static capabilities for now (matches our target contract)
const CAPABILITIES = {
  listSessions: true,
  disconnectSession: true,
  disconnectAllForUser: true,
  refreshSession: true,
};


exports.health = async (req, res) => {
  // 1) Stable instance identity (persisted if possible)
  const identity = getOrCreateInstanceId();

  // 2) Agent info (version/hostname/start time)
  const agent = buildAgentInfo({
    instanceId: identity.instanceId,
    startedAt: STARTED_AT,
  });

  // 3) ocserv readiness (fast)
  // config is stored on app.locals (we will set that in server.js)
  const config = req.app.locals.config;
  const ocserv = await checkOcservReady(config, { timeoutMs: 1500 });

  return res.json({
    ok: true,
    agent: {
      ...agent,
      persistedInstanceId: identity.persisted,
    },
    ocserv,
    capabilities: CAPABILITIES,
  });
};

exports.listSessions = async (req, res, next) => {
  try {
    const config = req.app.locals.config;
    const sessions = await loadAuthenticatedSessions(config);

    return res.json({
      ok: true,
      sessions,
      count: sessions.length,
    });
  } catch (err) {
    return next(err);
  }
};

exports.getSession = async (req, res, next) => {
  try {
    const config = req.app.locals.config;

    const vpnSessionId = req.query.vpnSessionId || null;
    const username = req.query.username || null;

    // Must provide at least one identifier
    if (!vpnSessionId && !username) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Provide vpnSessionId or username',
          requestId: req.requestId || null,
        },
      });
    }

    const sessions = await loadAuthenticatedSessions(config);

    // 1) Prefer vpnSessionId if provided
    if (vpnSessionId) {
      const session = findSessionById(sessions, vpnSessionId);
      return res.json({ ok: true, session });
    }

    // 2) Username lookup must be unique
    const result = findUniqueSessionByUsername(sessions, username);

    if (result.conflict) {
      return res.status(409).json({
        ok: false,
        error: {
          code: 'MULTIPLE_SESSIONS',
          message: `Multiple active sessions found for username=${username}. Use vpnSessionId.`,
          requestId: req.requestId || null,
        },
        matches: result.matches.map((s) => ({
          vpnSessionId: s.vpnSessionId,
          username: s.username,
          ip: s.ip,
          clientIp: s.clientIp,
          device: s.device,
          status: s.status,
        })),
      });
    }

    return res.json({ ok: true, session: result.session });
  } catch (err) {
    return next(err);
  }
};
