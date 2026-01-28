/**
 * Event/Audit stream utilities
 * Provides a standard activity events stream for notifications, metrics, and audit.
 */

const fs = require('fs');
const path = require('path');
const { uniqueId, ensureDataDir } = require('./data');

const EVENTS_FILE = path.join(__dirname, '..', 'data', 'events.json');

// Event types
const EventTypes = {
  // Item lifecycle
  ITEM_CREATED: 'ITEM_CREATED',
  ITEM_UPDATED: 'ITEM_UPDATED',
  ITEM_MOVED: 'ITEM_MOVED',
  ITEM_DELETED: 'ITEM_DELETED',
  
  // Comments & subtasks
  COMMENT_ADDED: 'COMMENT_ADDED',
  SUBTASK_ADDED: 'SUBTASK_ADDED',
  SUBTASK_UPDATED: 'SUBTASK_UPDATED',
  SUBTASK_DELETED: 'SUBTASK_DELETED',
  
  // Assignments & blocking
  ITEM_ASSIGNED: 'ITEM_ASSIGNED',
  ITEM_BLOCKED: 'ITEM_BLOCKED',
  ITEM_UNBLOCKED: 'ITEM_UNBLOCKED',
  
  // Mentions
  AGENT_MENTIONED: 'AGENT_MENTIONED'
};

// Initialize events file
function initEventsFile() {
  ensureDataDir();
  if (!fs.existsSync(EVENTS_FILE)) {
    fs.writeFileSync(EVENTS_FILE, JSON.stringify({ events: [] }, null, 2));
  }
}

function readEvents() {
  try {
    return JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf8'));
  } catch {
    return { events: [] };
  }
}

function writeEvents(data) {
  fs.writeFileSync(EVENTS_FILE, JSON.stringify(data, null, 2));
}

/**
 * Add an event to the stream
 * @param {string} type - Event type from EventTypes
 * @param {object} payload - Event-specific data
 * @param {string} actor - Who triggered the event (kenny, jimmy, dev, qa, system)
 */
function addEvent(type, payload, actor = 'system') {
  initEventsFile();
  const data = readEvents();
  
  const event = {
    id: uniqueId('evt'),
    type,
    timestamp: new Date().toISOString(),
    actor,
    payload
  };
  
  data.events.push(event);
  
  // Keep last 1000 events to prevent unbounded growth
  if (data.events.length > 1000) {
    data.events = data.events.slice(-1000);
  }
  
  writeEvents(data);
  return event;
}

/**
 * Get events with optional filters
 * @param {object} filters - Optional filters
 * @param {string} filters.type - Filter by event type
 * @param {string} filters.actor - Filter by actor
 * @param {string} filters.itemId - Filter by item ID
 * @param {string} filters.since - ISO timestamp, get events after this time
 * @param {number} filters.limit - Max number of events to return (default 100)
 */
function getEvents(filters = {}) {
  initEventsFile();
  const data = readEvents();
  let events = data.events;
  
  // Apply filters
  if (filters.type) {
    events = events.filter(e => e.type === filters.type);
  }
  
  if (filters.actor) {
    events = events.filter(e => e.actor === filters.actor);
  }
  
  if (filters.itemId) {
    events = events.filter(e => e.payload && e.payload.itemId === filters.itemId);
  }
  
  if (filters.since) {
    const sinceTime = new Date(filters.since).getTime();
    events = events.filter(e => new Date(e.timestamp).getTime() > sinceTime);
  }
  
  // Sort by timestamp descending (newest first)
  events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  // Apply limit
  const limit = filters.limit || 100;
  events = events.slice(0, limit);
  
  return events;
}

module.exports = {
  EVENTS_FILE,
  EventTypes,
  initEventsFile,
  readEvents,
  writeEvents,
  addEvent,
  getEvents
};
