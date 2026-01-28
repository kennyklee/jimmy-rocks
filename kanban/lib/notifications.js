/**
 * Notification utilities
 */

const fs = require('fs');
const path = require('path');
const { uniqueId, ensureDataDir } = require('./data');

const NOTIFICATIONS_FILE = path.join(__dirname, '..', 'data', 'notifications.json');

// Initialize notifications file
function initNotificationsFile() {
  ensureDataDir();
  if (!fs.existsSync(NOTIFICATIONS_FILE)) {
    fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify({ notifications: [] }, null, 2));
  }
}

function readNotifications() {
  try {
    return JSON.parse(fs.readFileSync(NOTIFICATIONS_FILE, 'utf8'));
  } catch {
    return { notifications: [] };
  }
}

function writeNotifications(data) {
  fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(data, null, 2));
}

function addNotification(type, payload) {
  const data = readNotifications();
  data.notifications.push({
    id: uniqueId('notif'),
    type,
    payload,
    createdAt: new Date().toISOString()
  });
  writeNotifications(data);
}

module.exports = {
  NOTIFICATIONS_FILE,
  initNotificationsFile,
  readNotifications,
  writeNotifications,
  addNotification
};
