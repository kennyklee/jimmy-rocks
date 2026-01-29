const express = require('express');
const router = express.Router();

router.use('/board', require('./board'));
router.use('/notifications', require('./notifications'));
router.use('/events', require('./events'));
router.use('/settings', require('./settings'));

module.exports = router;
