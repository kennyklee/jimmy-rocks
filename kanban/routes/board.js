/**
 * Board routes - GET /api/board, items CRUD, move, comments, subtasks
 */

const express = require('express');
const router = express.Router();

const { AppError } = require('../middleware/errorHandler');
const {
  validate,
  createItemValidation,
  updateItemValidation,
  addCommentValidation,
  moveItemValidation
} = require('../middleware/validation');

const { getUserName } = require('../lib/constants');
const {
  uniqueId,
  readData,
  writeData,
  normalizeTags,
  calculateStageTime,
  calculateCycleTime
} = require('../lib/data');
const { addNotification } = require('../lib/notifications');
const { addEvent, EventTypes } = require('../lib/events');

// Get board state
router.get('/board', (req, res) => {
  res.json(readData());
});

// Get metrics
router.get('/metrics', (req, res) => {
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
router.post('/items', validate(createItemValidation), (req, res) => {
  const { title, description, priority, columnId, tags } = req.body;
  const data = readData();
  const targetColumnId = columnId || 'todo';

  let finalTags;
  try {
    finalTags = normalizeTags(tags);
  } catch (e) {
    throw AppError.badRequest(e.message || 'Invalid tags');
  }
  
  // Auto-increment ticket number
  data.nextTicketNumber = (data.nextTicketNumber || 1);
  const ticketNumber = data.nextTicketNumber++;
  
  // Resolve creator from body or headers; tolerate legacy/buggy clients sending 'unknown'
  const createdByRaw = (
    req.body.createdBy ||
    req.headers['x-user'] ||
    req.headers['x-user-id'] ||
    req.headers['x-created-by'] ||
    ''
  );

  const createdByNormalized = String(createdByRaw).trim().toLowerCase();
  const createdBy = ['', 'unknown', 'null', 'undefined'].includes(createdByNormalized)
    ? ''
    : createdByNormalized;

  // API: require createdBy if provided context is missing; otherwise default to jimmy
  // (We don't have real auth yet, so this is the safest sensible default.)
  const finalCreatedBy = createdBy || 'jimmy';
  const newItem = {
    id: uniqueId('item'),
    number: ticketNumber,
    title,
    description: description || '',
    priority: priority || 'medium',
    assignee: req.body.assignee || 'jimmy',
    tags: finalTags,
    createdAt: new Date().toISOString(),
    createdBy: finalCreatedBy,
    comments: [
      {
        id: uniqueId('comment-created'),
        text: `Created by ${getUserName(finalCreatedBy)}`,
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
    
    // Emit ITEM_CREATED event
    addEvent(EventTypes.ITEM_CREATED, {
      itemId: newItem.id,
      itemNumber: newItem.number,
      title: newItem.title,
      column: targetColumnId,
      priority: newItem.priority,
      assignee: newItem.assignee,
      tags: newItem.tags
    }, finalCreatedBy);
    
    res.json(newItem);
  } else {
    throw AppError.badRequest('Invalid column');
  }
});

// Update item
router.put('/items/:id', validate(updateItemValidation), (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const data = readData();
  const actor = req.headers['x-user'] || req.body.updatedBy || 'system';

  // If client tries to clear tags, keep the invariant by defaulting to needs-triage.
  if ('tags' in updates) {
    try {
      updates.tags = normalizeTags(updates.tags);
    } catch (e) {
      throw AppError.badRequest(e.message || 'Invalid tags');
    }
  }
  
  for (const column of data.columns) {
    const itemIndex = column.items.findIndex(i => i.id === id);
    if (itemIndex !== -1) {
      const item = column.items[itemIndex];
      const autoComments = [];
      const changes = {};
      
      // Track changes for event
      for (const key of Object.keys(updates)) {
        if (item[key] !== updates[key]) {
          changes[key] = { from: item[key], to: updates[key] };
        }
      }
      
      // Check for assignment change
      if ('assignee' in updates && updates.assignee !== item.assignee) {
        const newAssignee = updates.assignee;
        autoComments.push({
          id: uniqueId('comment-assign'),
          text: newAssignee ? `Assigned to ${getUserName(newAssignee)}` : 'Unassigned',
          author: 'system',
          createdAt: new Date().toISOString()
        });
        
        // Emit ITEM_ASSIGNED event
        addEvent(EventTypes.ITEM_ASSIGNED, {
          itemId: item.id,
          itemNumber: item.number,
          title: item.title,
          fromAssignee: item.assignee,
          toAssignee: newAssignee
        }, actor);
        
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
        
        // Emit blocked/unblocked event
        if (newBlocked) {
          addEvent(EventTypes.ITEM_BLOCKED, {
            itemId: item.id,
            itemNumber: item.number,
            title: item.title,
            blockedBy: newBlocked
          }, actor);
        } else {
          addEvent(EventTypes.ITEM_UNBLOCKED, {
            itemId: item.id,
            itemNumber: item.number,
            title: item.title,
            wasBlockedBy: item.blockedBy
          }, actor);
        }
        
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
      
      // Emit ITEM_UPDATED event (if there were changes beyond assignment/blocking)
      if (Object.keys(changes).length > 0) {
        addEvent(EventTypes.ITEM_UPDATED, {
          itemId: item.id,
          itemNumber: item.number,
          title: item.title,
          changes
        }, actor);
      }
      
      return res.json(column.items[itemIndex]);
    }
  }
  
  throw AppError.notFound('Item');
});

// Move item to different column
router.post('/items/:id/move', validate(moveItemValidation), (req, res) => {
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
    throw AppError.notFound('Item');
  }
  
  // Add to new column
  const toColumn = data.columns.find(c => c.id === toColumnId);
  if (!toColumn) {
    fromColumn.items.push(item);
    throw AppError.badRequest('Invalid target column');
  }
  
  const actor = movedBy || item.assignee || 'unknown';
  
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
    
    // Emit ITEM_MOVED event
    addEvent(EventTypes.ITEM_MOVED, {
      itemId: item.id,
      itemNumber: item.number,
      title: item.title,
      fromColumn: fromColumn.id,
      toColumn: toColumnId
    }, actor);
    
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
  
  // Default insert behavior: append to bottom for most columns.
  // Special case: when moving to Done without an explicit position,
  // place the item at the top (newest first).
  const insertIndex = (typeof position === 'number')
    ? position
    : (toColumnId === 'done' ? 0 : toColumn.items.length);

  toColumn.items.splice(insertIndex, 0, item);
  
  writeData(data);
  res.json({ item, fromColumn: fromColumn.id, toColumn: toColumnId });
});

// Delete item
router.delete('/items/:id', (req, res) => {
  const { id } = req.params;
  const data = readData();
  const actor = req.headers['x-user'] || 'system';
  
  for (const column of data.columns) {
    const itemIndex = column.items.findIndex(i => i.id === id);
    if (itemIndex !== -1) {
      const deleted = column.items.splice(itemIndex, 1)[0];
      writeData(data);
      
      // Emit ITEM_DELETED event
      addEvent(EventTypes.ITEM_DELETED, {
        itemId: deleted.id,
        itemNumber: deleted.number,
        title: deleted.title,
        fromColumn: column.id
      }, actor);
      
      return res.json(deleted);
    }
  }
  
  throw AppError.notFound('Item');
});

// Add comment to item
router.post('/items/:id/comments', validate(addCommentValidation), (req, res) => {
  const { id } = req.params;
  const { text, author } = req.body;
  const data = readData();
  
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
      writeData(data);
      
      // Emit COMMENT_ADDED event
      addEvent(EventTypes.COMMENT_ADDED, {
        itemId: item.id,
        itemNumber: item.number,
        itemTitle: item.title,
        commentId: comment.id,
        commentText: text
      }, author || 'unknown');
      
      // Detect agent mentions (@pm/@claude->pm, @dev/@codex->dev, @qa/@gemini->qa)
      const mentionMap = {
        jimmy: "pm", pm: "pm", claude: "pm",
        dev: "dev", codex: "dev",
        qa: "qa", gemini: "qa"
      };
      const mentionRegex = /@(jimmy|pm|claude|dev|codex|qa|gemini)\b/gi;
      const mentions = [...text.matchAll(mentionRegex)].map(m => mentionMap[m[1].toLowerCase()]);
      const uniqueAgents = [...new Set(mentions)];
      
      for (const agent of uniqueAgents) {
        // Emit AGENT_MENTIONED event
        addEvent(EventTypes.AGENT_MENTIONED, {
          itemId: item.id,
          itemNumber: item.number,
          itemTitle: item.title,
          commentId: comment.id,
          targetAgent: agent
        }, author || 'unknown');
        
        addNotification('mention_agent', {
          itemId: item.id,
          itemNumber: item.number,
          itemTitle: item.title,
          commentId: comment.id,
          commentText: text,
          commentedAt: comment.createdAt,
          author: author,
          targetAgent: agent
        });
      }
      
      if (uniqueAgents.length > 0) {
        // Already notified agents, skip kenny_comment
      }
      // Create notification if Kenny comments (notify Jimmy)
      else if (author === 'kenny') {
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
  
  throw AppError.notFound('Item');
});

// Subtasks
router.post('/items/:id/subtasks', (req, res) => {
  const { id } = req.params;
  const { text } = req.body;
  const data = readData();
  const actor = req.headers['x-user'] || 'system';
  
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
      writeData(data);
      
      // Emit SUBTASK_ADDED event
      addEvent(EventTypes.SUBTASK_ADDED, {
        itemId: item.id,
        itemNumber: item.number,
        itemTitle: item.title,
        subtaskId: subtask.id,
        subtaskText: text
      }, actor);
      
      return res.json(subtask);
    }
  }
  
  throw AppError.notFound('Item');
});

router.put('/items/:id/subtasks/:subtaskId', (req, res) => {
  const { id, subtaskId } = req.params;
  const { completed, text } = req.body;
  const data = readData();
  const actor = req.headers['x-user'] || 'system';
  
  for (const column of data.columns) {
    const item = column.items.find(i => i.id === id);
    if (item && item.subtasks) {
      const subtask = item.subtasks.find(s => s.id === subtaskId);
      if (subtask) {
        const changes = {};
        if (typeof completed === 'boolean' && subtask.completed !== completed) {
          changes.completed = { from: subtask.completed, to: completed };
          subtask.completed = completed;
        }
        if (text !== undefined && subtask.text !== text) {
          changes.text = { from: subtask.text, to: text };
          subtask.text = text;
        }
        writeData(data);
        
        // Emit SUBTASK_UPDATED event
        if (Object.keys(changes).length > 0) {
          addEvent(EventTypes.SUBTASK_UPDATED, {
            itemId: item.id,
            itemNumber: item.number,
            subtaskId: subtask.id,
            changes
          }, actor);
        }
        
        return res.json(subtask);
      }
    }
  }
  
  throw AppError.notFound('Subtask');
});

router.delete('/items/:id/subtasks/:subtaskId', (req, res) => {
  const { id, subtaskId } = req.params;
  const data = readData();
  const actor = req.headers['x-user'] || 'system';
  
  for (const column of data.columns) {
    const item = column.items.find(i => i.id === id);
    if (item && item.subtasks) {
      const idx = item.subtasks.findIndex(s => s.id === subtaskId);
      if (idx !== -1) {
        const removed = item.subtasks.splice(idx, 1)[0];
        writeData(data);
        
        // Emit SUBTASK_DELETED event
        addEvent(EventTypes.SUBTASK_DELETED, {
          itemId: item.id,
          itemNumber: item.number,
          subtaskId: removed.id,
          subtaskText: removed.text
        }, actor);
        
        return res.json(removed);
      }
    }
  }
  
  throw AppError.notFound('Subtask');
});

module.exports = router;
