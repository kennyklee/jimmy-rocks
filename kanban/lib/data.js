/**
 * Data file utilities
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { COLUMNS } = require('./constants');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'board.json');

// Generate unique IDs to prevent collision under concurrent requests
function uniqueId(prefix) {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
  }
}

// Initialize data file if doesn't exist
function initDataFile() {
  ensureDataDir();
  if (!fs.existsSync(DATA_FILE)) {
    const initialData = {
      columns: COLUMNS.map(col => ({ ...col, items: [] })),
      lastUpdated: new Date().toISOString()
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
  }
}

function readData() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function backupCurrentData() {
  ensureDataDir();
  const backupName = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const backupPath = path.join(DATA_DIR, backupName);
  const currentData = readData();
  fs.writeFileSync(backupPath, JSON.stringify(currentData, null, 2));
  return { backupName, backupPath };
}

function writeData(data) {
  data.lastUpdated = new Date().toISOString();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Tags: ensure every item always has at least one tag.
// If none are provided, default to "needs-triage".
function normalizeTags(tags) {
  if (tags == null) return ['needs-triage'];
  if (!Array.isArray(tags)) {
    throw new Error('Tags must be an array of strings');
  }

  const cleaned = tags
    .map(t => String(t).trim())
    .filter(Boolean);

  return cleaned.length > 0 ? cleaned : ['needs-triage'];
}

// Calculate time spent in each stage for an item
function calculateStageTime(item) {
  if (!item.stageHistory || item.stageHistory.length === 0) {
    return {};
  }
  
  const stageTimes = {};
  const history = item.stageHistory;
  
  for (let i = 0; i < history.length; i++) {
    const entry = history[i];
    const nextEntry = history[i + 1];
    const endTime = nextEntry ? new Date(nextEntry.enteredAt) : new Date();
    const startTime = new Date(entry.enteredAt);
    const duration = endTime - startTime; // milliseconds
    
    if (!stageTimes[entry.column]) {
      stageTimes[entry.column] = 0;
    }
    stageTimes[entry.column] += duration;
  }
  
  return stageTimes;
}

// Calculate cycle time (todo -> done) in milliseconds
function calculateCycleTime(item) {
  if (!item.stageHistory || item.stageHistory.length === 0) {
    return null;
  }
  
  const todoEntry = item.stageHistory.find(h => h.column === 'todo');
  const doneEntry = item.stageHistory.find(h => h.column === 'done');
  
  if (!todoEntry || !doneEntry) {
    return null;
  }
  
  return new Date(doneEntry.enteredAt) - new Date(todoEntry.enteredAt);
}

module.exports = {
  DATA_FILE,
  uniqueId,
  ensureDataDir,
  initDataFile,
  readData,
  backupCurrentData,
  writeData,
  normalizeTags,
  calculateStageTime,
  calculateCycleTime
};
