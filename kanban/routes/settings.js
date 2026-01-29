const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const SETTINGS_PATH = path.join(__dirname, '../data/settings.json');

// GET settings
router.get('/', (req, res) => {
  fs.readFile(SETTINGS_PATH, 'utf-8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Could not read settings file' });
    try {
      res.json(JSON.parse(data));
    } catch (e) {
      res.status(500).json({ error: 'Invalid settings format' });
    }
  });
});

// POST settings
router.post('/', (req, res) => {
  const newSettings = req.body;
  fs.writeFile(SETTINGS_PATH, JSON.stringify(newSettings, null, 2), err => {
    if (err) return res.status(500).json({ error: 'Could not save settings' });
    res.json({ success: true });
  });
});

module.exports = router;
