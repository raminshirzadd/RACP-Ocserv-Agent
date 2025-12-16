// src/server.js
const express = require('express');

const { loadConfig } = require('../config/env');
const requestIdMiddleware = require('./middleware/requestId');
const authMiddleware = require('./middleware/auth');
const errorMiddleware = require('./middleware/error');

const ocservRoutes = require('./routes/ocservRoutes');

const config = loadConfig();

const app = express();
app.locals.config = config;
app.use(express.json());

// requestId on everything
app.use(requestIdMiddleware);

// auth on everything under /ocserv
app.use('/ocserv', authMiddleware(config), ocservRoutes);

// fallback 404
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
      requestId: req.requestId || null,
    },
  });
});

// error handler last
app.use(errorMiddleware);

app.listen(config.port, () => {
  console.log(`[ocserv-agent] listening on port ${config.port} (${config.nodeEnv})`);
});
