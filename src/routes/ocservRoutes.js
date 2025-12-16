// src/routes/ocserv.routes.js
const express = require('express');
const ocservController = require('../controllers/ocservController');

const router = express.Router();

// Contract endpoint
router.get('/health', ocservController.health);
router.get('/sessions', ocservController.listSessions);


module.exports = router;

