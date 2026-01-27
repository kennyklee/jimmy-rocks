const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3333;
const DATA_FILE = path.join(__dirname, 'data', 'board.json');

// Central user reference
const USERS = {
  kenny: { id: 'kenny', name: 'Kenny' },
  jimmy: { id: 'jimmy', name: 'Jimmy' }
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

// Notifications helper functions
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
    id: `notif-${Date.now()}`,
    type,
    payload,
    createdAt: new Date().toISOString()
  });
  writeNotifications(data);
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
function readData() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeData(data) {
  data.lastUpdated = new Date().toISOString();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
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
  const data = readData();
  const targetColumnId = columnId || 'todo';
  
  // Auto-increment ticket number
  data.nextTicketNumber = (data.nextTicketNumber || 1);
  const ticketNumber = data.nextTicketNumber++;
  
  const createdBy = req.body.createdBy || 'unknown';
  const newItem = {
    id: `item-${Date.now()}`,
    number: ticketNumber,
    title,
    description: description || '',
    priority: priority || 'medium',
    assignee: req.body.assignee || 'jimmy',
    createdAt: new Date().toISOString(),
    createdBy: createdBy,
    comments: [
      {
        id: `comment-${Date.now()}-created`,
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
  if (column) {
    column.items.push(newItem);
    writeData(data);
    res.json(newItem);
  } else {
    res.status(400).json({ error: 'Invalid column' });
  }
});

// Update item
app.put('/api/items/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const data = readData();
  
  for (const column of data.columns) {
    const itemIndex = column.items.findIndex(i => i.id === id);
    if (itemIndex !== -1) {
      const item = column.items[itemIndex];
      const autoComments = [];
      
      // Check for assignment change
      if ('assignee' in updates && updates.assignee !== item.assignee) {
        const newAssignee = updates.assignee;
        autoComments.push({
          id: `comment-${Date.now()}-assign`,
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
          id: `comment-${Date.now()}-block`,
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
      
      column.items[itemIndex] = { ...item, ...updates };
      writeData(data);
      return res.json(column.items[itemIndex]);
    }
  }
  
  res.status(404).json({ error: 'Item not found' });
});

// Move item to different column
app.post('/api/items/:id/move', (req, res) => {
  const { id } = req.params;
  const { toColumnId, position, movedBy } = req.body;
  const data = readData();
  
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
    return res.status(404).json({ error: 'Item not found' });
  }
  
  // Add to new column
  const toColumn = data.columns.find(c => c.id === toColumnId);
  if (!toColumn) {
    fromColumn.items.push(item);
    return res.status(400).json({ error: 'Invalid target column' });
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
      id: `comment-${Date.now()}-move`,
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
  }
  
  if (typeof position === 'number') {
    toColumn.items.splice(position, 0, item);
  } else {
    toColumn.items.push(item);
  }
  
  writeData(data);
  res.json({ item, fromColumn: fromColumn.id, toColumn: toColumnId });
});

// Delete item
app.delete('/api/items/:id', (req, res) => {
  const { id } = req.params;
  const data = readData();
  
  for (const column of data.columns) {
    const itemIndex = column.items.findIndex(i => i.id === id);
    if (itemIndex !== -1) {
      const deleted = column.items.splice(itemIndex, 1)[0];
      writeData(data);
      return res.json(deleted);
    }
  }
  
  res.status(404).json({ error: 'Item not found' });
});

// Add comment to item
app.post('/api/items/:id/comments', (req, res) => {
  const { id } = req.params;
  const { text, author } = req.body;
  const data = readData();
  
  for (const column of data.columns) {
    const item = column.items.find(i => i.id === id);
    if (item) {
      const comment = {
        id: `comment-${Date.now()}`,
        text,
        author: author || 'unknown',
        createdAt: new Date().toISOString()
      };
      item.comments = item.comments || [];
      item.comments.push(comment);
      writeData(data);
      
      // Create notification if Kenny comments (notify Jimmy)
      if (author === 'kenny') {
        addNotification('kenny_comment', {
          itemId: item.id,
          itemTitle: item.title,
          commentId: comment.id,
          commentText: text,
          commentedAt: comment.createdAt
        });
      }
      
      return res.json(comment);
    }
  }
  
  res.status(404).json({ error: 'Item not found' });
});

// Get pending notifications (for Jimmy to poll)
app.get('/api/notifications', (req, res) => {
  const data = readNotifications();
  res.json(data.notifications);
});

// Clear a notification (after Jimmy has processed it)
app.delete('/api/notifications/:id', (req, res) => {
  const { id } = req.params;
  const data = readNotifications();
  const index = data.notifications.findIndex(n => n.id === id);
  
  if (index !== -1) {
    const removed = data.notifications.splice(index, 1)[0];
    writeNotifications(data);
    return res.json(removed);
  }
  
  res.status(404).json({ error: 'Notification not found' });
});

// Clear all notifications
app.delete('/api/notifications', (req, res) => {
  writeNotifications({ notifications: [] });
  res.json({ cleared: true });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Kanban server running on http://0.0.0.0:${PORT}`);
});
