// src/routes/ocserv.routes.js
const express = require('express');
const ocservController = require('../controllers/ocservController');

const router = express.Router();

// Contract endpoint
router.get('/health', ocservController.health);
router.get('/sessions', ocservController.listSessions);
router.get('/session', ocservController.getSession);
router.post('/disconnect', ocservController.disconnect);
router.post('/disconnectAll', ocservController.disconnectAll);
router.get('/radius-config', ocservController.radiusConfig);
router.get('/status', ocservController.status);


module.exports = router;

