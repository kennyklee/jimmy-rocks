/**
 * Notification routes - GET/DELETE /api/notifications
 */

const express = require('express');
const router = express.Router();

const { AppError } = require('../middleware/errorHandler');
const {
  readNotifications,
  writeNotifications
} = require('../lib/notifications');

// Get pending notifications (for Jimmy to poll)
router.get('/notifications', (req, res) => {
  const data = readNotifications();
  res.json(data.notifications);
});

// Clear a notification (after Jimmy has processed it)
router.delete('/notifications/:id', (req, res) => {
  const { id } = req.params;
  const data = readNotifications();
  const index = data.notifications.findIndex(n => n.id === id);
  
  if (index !== -1) {
    const removed = data.notifications.splice(index, 1)[0];
    writeNotifications(data);
    return res.json(removed);
  }
  
  throw AppError.notFound('Notification');
});

// Clear all notifications
router.delete('/notifications', (req, res) => {
  writeNotifications({ notifications: [] });
  res.json({ cleared: true });
});

module.exports = router;
