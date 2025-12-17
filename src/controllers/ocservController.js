// src/controllers/ocserv.controller.js
const { getOrCreateInstanceId } = require('../services/instanceIdentity');
const { buildAgentInfo } = require('../services/agentInfo');
const { checkOcservReady } = require('../services/ocservReadiness');
const {
  loadAuthenticatedSessions,
  findSessionById,
  findUniqueSessionByUsername,
} = require('../services/ocservSessionsService');

const {
  disconnectSessionById,
  disconnectAllByUsername,
} = require('../services/ocservControlService');

const { loadRadiusIdentity } = require('../services/radiusConfigService');

const STARTED_AT = Date.now();

// Static capabilities for now (matches our target contract)
const CAPABILITIES = {
  listSessions: true,
  disconnectSession: true,
  disconnectAllForUser: true,
  refreshSession: true,
};


function badRequest(res, req, message) {
  return res.status(400).json({
    ok: false,
    error: {
      code: 'BAD_REQUEST',
      message,
      requestId: req.requestId || null,
    },
  });
}

function conflict(res, req, code, message, extra = {}) {
  return res.status(409).json({
    ok: false,
    error: {
      code,
      message,
      requestId: req.requestId || null,
    },
    ...extra,
  });
}


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

exports.disconnect = async (req, res, next) => {
  try {
    const config = req.app.locals.config;

    const vpnSessionId = req.body?.vpnSessionId ?? null;
    const username = req.body?.username ?? null;

    if (!vpnSessionId && !username) {
      return badRequest(res, req, 'Provide vpnSessionId or username');
    }

    const sessions = await loadAuthenticatedSessions(config);

    // 1) Prefer vpnSessionId
    if (vpnSessionId) {
      const session = findSessionById(sessions, vpnSessionId);
      if (!session) {
        return res.json({ ok: true, disconnected: false, reason: 'not_found' });
      }

      await disconnectSessionById(config, session.vpnSessionId);

      return res.json({
        ok: true,
        disconnected: true,
        vpnSessionId: session.vpnSessionId,
        username: session.username,
      });
    }

    // 2) Username path must resolve to a single active session
    const result = findUniqueSessionByUsername(sessions, username);

    if (result.conflict) {
      return conflict(
        res,
        req,
        'MULTIPLE_SESSIONS',
        `Multiple active sessions found for username=${username}. Use vpnSessionId.`,
        {
          matches: result.matches.map((s) => ({
            vpnSessionId: s.vpnSessionId,
            username: s.username,
            ip: s.ip,
            clientIp: s.clientIp,
            device: s.device,
            status: s.status,
          })),
        }
      );
    }

    if (!result.session) {
      return res.json({ ok: true, disconnected: false, reason: 'not_found' });
    }

    await disconnectSessionById(config, result.session.vpnSessionId);

    return res.json({
      ok: true,
      disconnected: true,
      vpnSessionId: result.session.vpnSessionId,
      username: result.session.username,
    });
  } catch (err) {
    return next(err);
  }
};

exports.disconnectAll = async (req, res, next) => {
  try {
    const config = req.app.locals.config;

    const username = req.body?.username ?? null;
    if (!username) {
      return badRequest(res, req, 'Provide username');
    }

    // Optional: load sessions first so we can report count + ids
    const sessions = await loadAuthenticatedSessions(config);
    const matches = sessions.filter((s) => s.username === username);
    const ids = matches.map((s) => s.vpnSessionId);

    // Let ocserv do the disconnect itself
    await disconnectAllByUsername(config, username);

    return res.json({
      ok: true,
      username,
      disconnectedCount: ids.length,
      disconnectedSessionIds: ids,
    });
  } catch (err) {
    return next(err);
  }
};


exports.radiusConfig = async (req, res, next) => {
  try {
    const config = req.app.locals.config;
    const data = await loadRadiusIdentity(config);
    return res.json(data);
  } catch (err) {
    return next(err);
  }
};
