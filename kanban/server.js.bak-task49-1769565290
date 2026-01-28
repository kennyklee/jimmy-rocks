const express = require('express');
const crypto = require('crypto');

// Generate unique IDs to prevent collision under concurrent requests
function uniqueId(prefix) {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3333;
const DATA_FILE = path.join(__dirname, 'data', 'board.json');

// Central user reference
const USERS = {
  kenny: { id: 'kenny', name: 'Kenny' },
  jimmy: { id: 'jimmy', name: 'Jimmy' },
  dev: { id: 'dev', name: 'Dev' },
  qa: { id: 'qa', name: 'QA' }
};

function getUserName(userId) {
  return USERS[userId]?.name || userId || 'Unknown';
}
const NOTIFICATIONS_FILE = path.join(__dirname, 'data', 'notifications.json');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}

// Initialize notifications file
if (!fs.existsSync(NOTIFICATIONS_FILE)) {
  fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify({ notifications: [] }, null, 2));
}

// -----------------------------
// File safety helpers
// -----------------------------

function sleepSync(ms) {
  // Node doesn't have a built-in sync sleep; Atomics.wait is a common workaround.
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function withFileLock(lockPath, fn, { timeoutMs = 5000, retryMs = 25 } = {}) {
  const start = Date.now();
  let fd = null;

  while (true) {
    try {
      fd = fs.openSync(lockPath, 'wx');
      fs.writeFileSync(fd, `${process.pid} ${new Date().toISOString()}\n`);
      break;
    } catch (err) {
      if (err && err.code === 'EEXIST') {
        if (Date.now() - start > timeoutMs) {
          throw new Error(`Timeout acquiring lock: ${lockPath}`);
        }
        sleepSync(retryMs);
        continue;
      }
      throw err;
    }
  }

  try {
    return fn();
  } finally {
    try { if (fd) fs.closeSync(fd); } catch {}
    try { fs.unlinkSync(lockPath); } catch {}
  }
}

function safeReadJson(filePath, defaultValue) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    // If the JSON is corrupted, don't crash the server.
    // Best effort: preserve the broken file for later inspection.
    try {
      if (fs.existsSync(filePath)) {
        const corruptPath = `${filePath}.corrupt-${Date.now()}`;
        fs.renameSync(filePath, corruptPath);
      }
    } catch {}
    return defaultValue;
  }
}

function atomicWriteJson(filePath, obj) {
  const dir = path.dirname(filePath);
  const base = path.basename(filePath);
  const tmpPath = path.join(dir, `.${base}.${process.pid}.${Date.now()}.tmp`);
  const payload = JSON.stringify(obj, null, 2);

  fs.writeFileSync(tmpPath, payload);
  // rename within same directory is atomic on POSIX
  fs.renameSync(tmpPath, filePath);
}

// Notifications helper functions (lock + atomic write)
function defaultNotificationsData() {
  return { notifications: [] };
}

function readNotifications() {
  return safeReadJson(NOTIFICATIONS_FILE, defaultNotificationsData());
}

function writeNotifications(data) {
  const lockPath = `${NOTIFICATIONS_FILE}.lock`;
  withFileLock(lockPath, () => {
    atomicWriteJson(NOTIFICATIONS_FILE, data);
  });
}

function updateNotifications(mutator) {
  const lockPath = `${NOTIFICATIONS_FILE}.lock`;
  return withFileLock(lockPath, () => {
    const data = safeReadJson(NOTIFICATIONS_FILE, defaultNotificationsData());
    const result = mutator(data);
    atomicWriteJson(NOTIFICATIONS_FILE, data);
    return result;
  });
}

function addNotification(type, payload) {
  updateNotifications(data => {
    data.notifications.push({
      id: uniqueId('notif'),
      type,
      payload,
      createdAt: new Date().toISOString()
    });
  });
}

// Column definitions
const COLUMNS = [
  { id: 'backlog', title: 'Backlog' },
  { id: 'todo', title: 'Todo' },
  { id: 'doing', title: 'Doing' },
  { id: 'review', title: 'Review' },
  { id: 'done', title: 'Done' }
];

// Initialize data file if doesn't exist
if (!fs.existsSync(DATA_FILE)) {
  const initialData = {
    columns: COLUMNS.map(col => ({ ...col, items: [] })),
    lastUpdated: new Date().toISOString()
  };
  fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper functions
function defaultBoardData() {
  return {
    columns: COLUMNS.map(col => ({ ...col, items: [] })),
    lastUpdated: new Date().toISOString(),
    nextTicketNumber: 1
  };
}

function readData() {
  return safeReadJson(DATA_FILE, defaultBoardData());
}

function writeData(data) {
  // For cases where callers already have the full desired state.
  data.lastUpdated = new Date().toISOString();
  const lockPath = `${DATA_FILE}.lock`;
  withFileLock(lockPath, () => {
    atomicWriteJson(DATA_FILE, data);
  });
}

function updateData(mutator) {
  // Prevent lost updates by locking around read-modify-write.
  const lockPath = `${DATA_FILE}.lock`;
  return withFileLock(lockPath, () => {
    const data = safeReadJson(DATA_FILE, defaultBoardData());
    const result = mutator(data);
    data.lastUpdated = new Date().toISOString();
    atomicWriteJson(DATA_FILE, data);
    return result;
  });
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

// API Routes

// Get board state
app.get('/api/board', (req, res) => {
  res.json(readData());
});

// Get metrics
app.get('/api/metrics', (req, res) => {
  const data = readData();
  const allItems = [];
  const completedItems = [];
  
  // Gather all items
  for (const col of data.columns) {
    for (const item of col.items) {
      allItems.push({ ...item, currentColumn: col.id });
      if (col.id === 'done') {
        completedItems.push(item);
      }
    }
  }
  
  // Calculate metrics
  const metrics = {
    // Overview
    totalTasks: allItems.length,
    completedTasks: completedItems.length,
    tasksInProgress: data.columns.find(c => c.id === 'doing')?.items.length || 0,
    tasksInReview: data.columns.find(c => c.id === 'review')?.items.length || 0,
    
    // Cycle time (for completed tasks)
    avgCycleTime: null,
    cycleTimes: [],
    
    // Time in each stage (for completed tasks)
    avgTimePerStage: {},
    
    // Throughput (tasks completed per day)
    throughputByDay: {},
    
    // Tasks by column
    tasksByColumn: {},
    
    // Tasks by assignee
    tasksByAssignee: { kenny: 0, jimmy: 0, unassigned: 0 }
  };
  
  // Tasks by column
  for (const col of data.columns) {
    metrics.tasksByColumn[col.id] = col.items.length;
  }
  
  // Tasks by assignee
  for (const item of allItems) {
    if (item.assignee === 'kenny') metrics.tasksByAssignee.kenny++;
    else if (item.assignee === 'jimmy') metrics.tasksByAssignee.jimmy++;
    else metrics.tasksByAssignee.unassigned++;
  }
  
  // Cycle times for completed tasks
  const cycleTimes = [];
  const stageTimeTotals = {};
  const stageTimeCounts = {};
  
  for (const item of completedItems) {
    const cycleTime = calculateCycleTime(item);
    if (cycleTime !== null) {
      cycleTimes.push({
        id: item.id,
        title: item.title,
        cycleTime,
        cycleTimeHours: Math.round(cycleTime / (1000 * 60 * 60) * 10) / 10
      });
    }
    
    // Stage times
    const stageTimes = calculateStageTime(item);
    for (const [stage, time] of Object.entries(stageTimes)) {
      if (!stageTimeTotals[stage]) {
        stageTimeTotals[stage] = 0;
        stageTimeCounts[stage] = 0;
      }
      stageTimeTotals[stage] += time;
      stageTimeCounts[stage]++;
    }
    
    // Throughput by completion day
    const doneEntry = item.stageHistory?.find(h => h.column === 'done');
    if (doneEntry) {
      const day = doneEntry.enteredAt.split('T')[0];
      metrics.throughputByDay[day] = (metrics.throughputByDay[day] || 0) + 1;
    }
  }
  
  // Average cycle time
  if (cycleTimes.length > 0) {
    const totalCycleTime = cycleTimes.reduce((sum, ct) => sum + ct.cycleTime, 0);
    metrics.avgCycleTime = totalCycleTime / cycleTimes.length;
    metrics.avgCycleTimeHours = Math.round(metrics.avgCycleTime / (1000 * 60 * 60) * 10) / 10;
  }
  metrics.cycleTimes = cycleTimes;
  
  // Average time per stage
  for (const [stage, total] of Object.entries(stageTimeTotals)) {
    metrics.avgTimePerStage[stage] = {
      avgMs: Math.round(total / stageTimeCounts[stage]),
      avgHours: Math.round(total / stageTimeCounts[stage] / (1000 * 60 * 60) * 10) / 10,
      count: stageTimeCounts[stage]
    };
  }
  
  res.json(metrics);
});

// Create new item
app.post('/api/items', (req, res) => {
  const { title, description, priority, columnId } = req.body;
  const targetColumnId = columnId || 'todo';

  // -----------------------------
  // Input validation
  // -----------------------------
  const errors = [];

  const normalizedTitle = (typeof title === 'string') ? title.trim() : '';
  if (!normalizedTitle) {
    errors.push('title is required');
  } else if (normalizedTitle.length > 200) {
    errors.push('title must be at most 200 characters');
  }

  if (description != null && typeof description !== 'string') {
    errors.push('description must be a string');
  } else if (typeof description === 'string' && description.length > 5000) {
    errors.push('description must be at most 5000 characters');
  }

  const allowedPriorities = new Set(['low', 'medium', 'high', 'urgent']);
  if (priority != null && typeof priority !== 'string') {
    errors.push('priority must be a string');
  } else if (typeof priority === 'string' && priority && !allowedPriorities.has(priority)) {
    errors.push('priority must be one of: low, medium, high, urgent');
  }

  const allowedAssignees = new Set(['', 'kenny', 'jimmy', 'dev', 'qa']);
  const assigneeRaw = ('assignee' in req.body) ? req.body.assignee : undefined;
  const normalizedAssignee = (assigneeRaw == null) ? undefined : String(assigneeRaw).trim();
  if (normalizedAssignee !== undefined && !allowedAssignees.has(normalizedAssignee)) {
    errors.push('assignee must be empty or one of: kenny, jimmy, dev, qa');
  }

  if (errors.length) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  try {
    const { newItem } = updateData(data => {
      // Auto-increment ticket number
      data.nextTicketNumber = (data.nextTicketNumber || 1);
      const ticketNumber = data.nextTicketNumber++;

      const createdBy = req.body.createdBy || 'unknown';
      const newItem = {
        id: uniqueId('item'),
        number: ticketNumber,
        title: normalizedTitle,
        description: description || '',
        priority: priority || 'medium',
        assignee: ('assignee' in req.body) ? (normalizedAssignee ?? '') : 'jimmy',
        createdAt: new Date().toISOString(),
        createdBy: createdBy,
        comments: [
          {
            id: uniqueId('comment-created'),
            text: `Created by ${getUserName(createdBy)}`,
            author: 'system',
            createdAt: new Date().toISOString()
          }
        ],
        // Track stage history for metrics
        stageHistory: [
          { column: targetColumnId, enteredAt: new Date().toISOString() }
        ]
      };

      const column = data.columns.find(c => c.id === targetColumnId);
      if (!column) {
        const err = new Error('Invalid column');
        err.statusCode = 400;
        throw err;
      }

      column.items.push(newItem);
      return { newItem };
    });

    res.json(newItem);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Server error' });
  }
});

// Update item
app.put('/api/items/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const { updatedItem } = updateData(data => {
      for (const column of data.columns) {
        const itemIndex = column.items.findIndex(i => i.id === id);
        if (itemIndex !== -1) {
          const item = column.items[itemIndex];
          const autoComments = [];

          // Check for assignment change
          if ('assignee' in updates && updates.assignee !== item.assignee) {
            const newAssignee = updates.assignee;
            autoComments.push({
              id: uniqueId('comment-assign'),
              text: newAssignee ? `Assigned to ${getUserName(newAssignee)}` : 'Unassigned',
              author: 'system',
              createdAt: new Date().toISOString()
            });

            // Notify when assigned to Kenny
            if (newAssignee === 'kenny') {
              addNotification('assigned_to_kenny', {
                itemId: item.id,
                itemTitle: item.title
              });
            }
          }

          // Check for blocked status change
          if ('blockedBy' in updates && updates.blockedBy !== item.blockedBy) {
            const newBlocked = updates.blockedBy;
            autoComments.push({
              id: uniqueId('comment-block'),
              text: newBlocked ? `Blocked by ${getUserName(newBlocked)}` : 'Unblocked',
              author: 'system',
              createdAt: new Date().toISOString()
            });

            // Notify if blocked by Kenny
            if (newBlocked === 'kenny') {
              addNotification('blocked_by_kenny', {
                itemId: item.id,
                itemTitle: item.title
              });
            }
          }

          // Add auto-comments
          if (autoComments.length > 0) {
            item.comments = item.comments || [];
            item.comments.push(...autoComments);
          }

          const updatedItem = { ...item, ...updates };
          column.items[itemIndex] = updatedItem;
          return { updatedItem };
        }
      }

      const err = new Error('Item not found');
      err.statusCode = 404;
      throw err;
    });

    res.json(updatedItem);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Server error' });
  }
});

// Move item to different column
app.post('/api/items/:id/move', (req, res) => {
  const { id } = req.params;
  const { toColumnId, position, movedBy } = req.body;

  try {
    const { item, fromColumnId } = updateData(data => {
      let item = null;
      let fromColumn = null;

      // Find and remove item from current column
      for (const column of data.columns) {
        const itemIndex = column.items.findIndex(i => i.id === id);
        if (itemIndex !== -1) {
          item = column.items.splice(itemIndex, 1)[0];
          fromColumn = column;
          break;
        }
      }

      if (!item) {
        const err = new Error('Item not found');
        err.statusCode = 404;
        throw err;
      }

      // Add to new column
      const toColumn = data.columns.find(c => c.id === toColumnId);
      if (!toColumn) {
        // revert
        fromColumn.items.push(item);
        const err = new Error('Invalid target column');
        err.statusCode = 400;
        throw err;
      }

      // Track stage history (only if actually changing columns)
      if (fromColumn.id !== toColumnId) {
        if (!item.stageHistory) {
          item.stageHistory = [];
        }
        item.stageHistory.push({
          column: toColumnId,
          enteredAt: new Date().toISOString()
        });

        // Auto-comment for any column move
        const columnName = toColumnId.charAt(0).toUpperCase() + toColumnId.slice(1);
        const movedByUser = movedBy || item.assignee || 'unknown';
        item.comments = item.comments || [];
        item.comments.push({
          id: uniqueId('comment-move'),
          text: `Moved to ${columnName} by ${getUserName(movedByUser)}`,
          author: 'system',
          createdAt: new Date().toISOString()
        });

        // Notify Kenny when Jimmy moves to Done
        if (toColumnId === 'done' && movedByUser === 'jimmy') {
          addNotification('jimmy_completed', {
            itemId: item.id,
            itemTitle: item.title
          });
        }

        // Notify Jimmy when cards move to Review (needs his attention)
        if (toColumnId === 'review') {
          addNotification('moved_to_review', {
            itemId: item.id,
            itemNumber: item.number,
            itemTitle: item.title,
            movedBy: movedByUser
          });
        }
      }

      if (typeof position === 'number') {
        toColumn.items.splice(position, 0, item);
      } else {
        // Done column: newest at top; others: append to bottom
        if (toColumnId === 'done') {
          toColumn.items.unshift(item);
        } else {
          toColumn.items.push(item);
        }
      }

      return { item, fromColumnId: fromColumn.id };
    });

    res.json({ item, fromColumn: fromColumnId, toColumn: toColumnId });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Server error' });
  }
});

// Delete item
app.delete('/api/items/:id', (req, res) => {
  const { id } = req.params;

  try {
    const { deleted } = updateData(data => {
      for (const column of data.columns) {
        const itemIndex = column.items.findIndex(i => i.id === id);
        if (itemIndex !== -1) {
          const deleted = column.items.splice(itemIndex, 1)[0];
          return { deleted };
        }
      }

      const err = new Error('Item not found');
      err.statusCode = 404;
      throw err;
    });

    res.json(deleted);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Server error' });
  }
});

// Add comment to item
app.post('/api/items/:id/comments', (req, res) => {
  const { id } = req.params;
  const { text, author } = req.body;

  try {
    const { comment, itemInfo } = updateData(data => {
      for (const column of data.columns) {
        const item = column.items.find(i => i.id === id);
        if (item) {
          const comment = {
            id: uniqueId('comment'),
            text,
            author: author || 'unknown',
            createdAt: new Date().toISOString()
          };
          item.comments = item.comments || [];
          item.comments.push(comment);

          return {
            comment,
            itemInfo: { id: item.id, number: item.number, title: item.title }
          };
        }
      }

      const err = new Error('Item not found');
      err.statusCode = 404;
      throw err;
    });

    // Detect agent mentions (@pm/@claude->pm, @dev/@codex->dev, @qa/@gemini->qa)
    const mentionMap = {
      jimmy: 'pm', pm: 'pm', claude: 'pm',
      dev: 'dev', codex: 'dev',
      qa: 'qa', gemini: 'qa'
    };
    const mentionRegex = /@(jimmy|pm|claude|dev|codex|qa|gemini)\b/gi;
    const mentions = [...text.matchAll(mentionRegex)].map(m => mentionMap[m[1].toLowerCase()]);
    const uniqueAgents = [...new Set(mentions)];

    for (const agent of uniqueAgents) {
      addNotification('mention_agent', {
        itemId: itemInfo.id,
        itemNumber: itemInfo.number,
        itemTitle: itemInfo.title,
        commentId: comment.id,
        commentText: text,
        commentedAt: comment.createdAt,
        author: author,
        targetAgent: agent
      });
    }

    if (uniqueAgents.length === 0 && author === 'kenny') {
      addNotification('kenny_comment', {
        itemId: itemInfo.id,
        itemTitle: itemInfo.title,
        commentId: comment.id,
        commentText: text,
        commentedAt: comment.createdAt
      });
    }

    return res.json(comment);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Server error' });
  }
});

// Subtasks
app.post('/api/items/:id/subtasks', (req, res) => {
  const { id } = req.params;
  const { text } = req.body;

  try {
    const { subtask } = updateData(data => {
      for (const column of data.columns) {
        const item = column.items.find(i => i.id === id);
        if (item) {
          const subtask = {
            id: uniqueId('subtask'),
            text,
            completed: false,
            createdAt: new Date().toISOString()
          };
          item.subtasks = item.subtasks || [];
          item.subtasks.push(subtask);
          return { subtask };
        }
      }

      const err = new Error('Item not found');
      err.statusCode = 404;
      throw err;
    });

    res.json(subtask);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Server error' });
  }
});

app.put('/api/items/:id/subtasks/:subtaskId', (req, res) => {
  const { id, subtaskId } = req.params;
  const { completed, text } = req.body;

  try {
    const { subtask } = updateData(data => {
      for (const column of data.columns) {
        const item = column.items.find(i => i.id === id);
        if (item && item.subtasks) {
          const subtask = item.subtasks.find(s => s.id === subtaskId);
          if (subtask) {
            if (typeof completed === 'boolean') subtask.completed = completed;
            if (text !== undefined) subtask.text = text;
            return { subtask };
          }
        }
      }

      const err = new Error('Subtask not found');
      err.statusCode = 404;
      throw err;
    });

    res.json(subtask);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Server error' });
  }
});

app.delete('/api/items/:id/subtasks/:subtaskId', (req, res) => {
  const { id, subtaskId } = req.params;

  try {
    const { removed } = updateData(data => {
      for (const column of data.columns) {
        const item = column.items.find(i => i.id === id);
        if (item && item.subtasks) {
          const idx = item.subtasks.findIndex(s => s.id === subtaskId);
          if (idx !== -1) {
            const removed = item.subtasks.splice(idx, 1)[0];
            return { removed };
          }
        }
      }

      const err = new Error('Subtask not found');
      err.statusCode = 404;
      throw err;
    });

    res.json(removed);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Server error' });
  }
});

// Get pending notifications (for Jimmy to poll)
app.get('/api/notifications', (req, res) => {
  const data = readNotifications();
  res.json(data.notifications);
});

// Clear a notification (after Jimmy has processed it)
app.delete('/api/notifications/:id', (req, res) => {
  const { id } = req.params;

  try {
    const { removed } = updateNotifications(data => {
      const index = data.notifications.findIndex(n => n.id === id);
      if (index === -1) {
        const err = new Error('Notification not found');
        err.statusCode = 404;
        throw err;
      }
      const removed = data.notifications.splice(index, 1)[0];
      return { removed };
    });

    res.json(removed);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Server error' });
  }
});

// Clear all notifications
app.delete('/api/notifications', (req, res) => {
  writeNotifications({ notifications: [] });
  res.json({ cleared: true });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Kanban server running on http://0.0.0.0:${PORT}`);
});
