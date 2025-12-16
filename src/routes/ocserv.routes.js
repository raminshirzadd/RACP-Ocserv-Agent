// src/routes/ocserv.routes.js
const express = require('express');
const controller = require('../controllers/ocserv.controller');

const router = express.Router();

// Contract endpoint
router.get('/health', controller.health);

module.exports = router;
