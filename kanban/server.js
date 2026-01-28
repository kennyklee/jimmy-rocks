const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const path = require('path');

// Initialize data files
const { initDataFile } = require('./lib/data');
const { initNotificationsFile } = require('./lib/notifications');

// Middleware
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Routes
const boardRoutes = require('./routes/board');
const notificationRoutes = require('./routes/notifications');

// Initialize
initDataFile();
initNotificationsFile();

const app = express();
const PORT = process.env.PORT || 3333;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));
app.use(express.static(path.join(__dirname, 'public')));

// Mount API routes
app.use('/api', boardRoutes);
app.use('/api', notificationRoutes);

// 404 handler for unmatched API routes
app.use('/api', notFoundHandler);

// Central error handler (must be last)
app.use(errorHandler);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Kanban server running on http://0.0.0.0:${PORT}`);
});
