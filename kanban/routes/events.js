/**
 * Events routes - GET /api/events
 */

const express = require('express');
const router = express.Router();

const { getEvents, EventTypes } = require('../lib/events');

// Get events with optional filters
// Query params: type, actor, itemId, since, limit
router.get('/events', (req, res) => {
  const filters = {};
  
  if (req.query.type) filters.type = req.query.type;
  if (req.query.actor) filters.actor = req.query.actor;
  if (req.query.itemId) filters.itemId = req.query.itemId;
  if (req.query.since) filters.since = req.query.since;
  if (req.query.limit) filters.limit = parseInt(req.query.limit, 10);
  
  const events = getEvents(filters);
  res.json({
    events,
    eventTypes: Object.keys(EventTypes)
  });
});

// Get event types (for documentation/discovery)
router.get('/events/types', (req, res) => {
  res.json(EventTypes);
});

module.exports = router;
