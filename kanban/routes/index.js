const express = require('express');
const router = express.Router();

const boardRoutes = require('./board');
const notificationRoutes = require('./notifications');
const eventsRoutes = require('./events');
const settingsRoutes = require('./settings');

// Mount board routes directly (not nested under /board)
router.use('/', boardRoutes);
router.use('/', notificationRoutes);
router.use('/', eventsRoutes);
router.use('/settings', settingsRoutes);

module.exports = router;
