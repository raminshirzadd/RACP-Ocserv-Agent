// src/controllers/ocserv.controller.js
const { getOrCreateInstanceId } = require('../services/instanceIdentity');
const { buildAgentInfo } = require('../services/agentInfo');
const { checkOcservReady } = require('../services/ocservReadiness');
const { loadAuthenticatedSessions } = require('../services/ocservSessionsService');

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
