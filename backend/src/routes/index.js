// Master API v1 Route Registry
const express = require('express');
const authRoutes = require('./auth.routes');

const router = express.Router();

// Mount authentication routes under /api/v1/auth
router.use('/auth', authRoutes);

module.exports = router;
