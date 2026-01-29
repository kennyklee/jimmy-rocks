const express = require('express');
const cors = require('cors');
const path = require('path');

// Initialize data files
const { initDataFile } = require('./lib/data');
const { initNotificationsFile } = require('./lib/notifications');
const { initEventsFile } = require('./lib/events');

// Middleware
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Routes
const apiRoutes = require('./routes');

// Initialize
initDataFile();
initNotificationsFile();
initEventsFile();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Mount API routes
app.use('/api', apiRoutes);

// 404 handler for unmatched API routes
app.use('/api', notFoundHandler);

// Central error handler (must be last)
app.use(errorHandler);

module.exports = app;
