const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3333;
const DATA_FILE = path.join(__dirname, 'data', 'board.json');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
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

// API Routes

// Get board state
app.get('/api/board', (req, res) => {
  res.json(readData());
});

// Create new item
app.post('/api/items', (req, res) => {
  const { title, description, priority, columnId } = req.body;
  const data = readData();
  
  const newItem = {
    id: `item-${Date.now()}`,
    title,
    description: description || '',
    priority: priority || 'medium',
    createdAt: new Date().toISOString(),
    createdBy: req.body.createdBy || 'unknown',
    comments: []
  };
  
  const column = data.columns.find(c => c.id === (columnId || 'todo'));
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
      column.items[itemIndex] = { ...column.items[itemIndex], ...updates };
      writeData(data);
      return res.json(column.items[itemIndex]);
    }
  }
  
  res.status(404).json({ error: 'Item not found' });
});

// Move item to different column
app.post('/api/items/:id/move', (req, res) => {
  const { id } = req.params;
  const { toColumnId, position } = req.body;
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
    // Put it back if target column not found
    fromColumn.items.push(item);
    return res.status(400).json({ error: 'Invalid target column' });
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
      return res.json(comment);
    }
  }
  
  res.status(404).json({ error: 'Item not found' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Kanban server running on http://0.0.0.0:${PORT}`);
});
