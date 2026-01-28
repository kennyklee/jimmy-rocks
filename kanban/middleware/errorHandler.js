/**
 * Centralized error handling middleware
 * 
 * Standard error format: { error: string, details?: array }
 * Matches validation middleware format from #77
 */

// Custom error class for throwing consistent errors throughout the app
class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true; // Distinguishes from programming errors
    
    Error.captureStackTrace(this, this.constructor);
  }

  // Static factory methods for common error types
  static badRequest(message, details = null) {
    return new AppError(message, 400, details);
  }

  static notFound(resource = 'Resource') {
    return new AppError(`${resource} not found`, 404);
  }

  static conflict(message) {
    return new AppError(message, 409);
  }

  static internal(message = 'Internal server error') {
    return new AppError(message, 500);
  }
}

// Wrapper for async route handlers to catch errors automatically
// Usage: app.get('/route', asyncHandler(async (req, res) => { ... }))
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Central error handling middleware - must be added after all routes
function errorHandler(err, req, res, next) {
  // Avoid double-sending if headers already sent
  if (res.headersSent) {
    return next(err);
  }

  // Log error for debugging (but not in tests)
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[Error] ${err.statusCode || 500} - ${err.message}`);
    if (!err.isOperational) {
      console.error(err.stack);
    }
  }

  // Handle AppError (operational errors we control)
  if (err instanceof AppError) {
    const response = { error: err.message };
    if (err.details) {
      response.details = err.details;
    }
    return res.status(err.statusCode).json(response);
  }

  // Handle SyntaxError from JSON parsing (body-parser)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'Invalid JSON',
      details: [{ field: 'body', message: 'Request body must be valid JSON' }]
    });
  }

  // Handle unknown/programming errors
  const statusCode = err.statusCode || err.status || 500;
  const message = err.isOperational ? err.message : 'Internal server error';
  
  return res.status(statusCode).json({ error: message });
}

// 404 handler for unmatched API routes
// Mounted on /api path, so req.path is relative to mount point
function notFoundHandler(req, res, next) {
  // req.originalUrl contains the full path
  return res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

module.exports = {
  AppError,
  asyncHandler,
  errorHandler,
  notFoundHandler
};
